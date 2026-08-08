import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { parseCifraClubTexto, pareceLinhaDeAcordes, marcarGrupoAlternativo } from './cifraClubParser.js';
import { extractLyrics } from './chordpro.js';

/**
 * Extrai cifra em ChordPro de um PDF com camada de texto real (padrão
 * Cifra Club / "Músicas para Missa" — linha de acordes acima da linha de
 * letra, alinhadas por coluna). PDFs sem camada de texto (scan/foto)
 * retornam chordsContent vazio — precisam de OCR ou digitação manual,
 * fora do escopo daqui (ver limitação em scripts/README.md).
 *
 * Mesma heurística de scripts/extract_cifra_pdf.py (uso local/offline em
 * lote, coordenadas via pdfplumber), portada pra pdfjs-dist pra rodar
 * dentro da function serverless: reconstrói cada página como texto
 * pseudo-monoespaçado (coordenada x real -> coluna de caractere) e
 * reaproveita o parser de coluna já usado pela importação via link do
 * Cifra Club (mesma lógica, já testada e com o bug de colchete corrigido).
 */

interface ItemPosicionado {
  str: string;
  x: number;
  y: number;
  width: number;
}

// linhas de rodapé/cabeçalho de impressão do site, não fazem parte da cifra
const LINHA_RODAPE_PAGINA = /^\d+\/\d+$/; // "1/2", "2/2"
const LINHA_CABECALHO_DATA = /^\d{2}\/\d{2}\/\d{4}\b/; // "23/11/2019 ... - Músicas para Missa"

function agruparPorLinha(items: ItemPosicionado[], tolerancia = 2.5): ItemPosicionado[][] {
  const ordenados = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const linhas: ItemPosicionado[][] = [];
  let atual: ItemPosicionado[] = [];
  let yAtual: number | null = null;
  for (const it of ordenados) {
    if (yAtual === null || Math.abs(it.y - yAtual) <= tolerancia) {
      atual.push(it);
      if (yAtual === null) yAtual = it.y;
    } else {
      linhas.push(atual);
      atual = [it];
      yAtual = it.y;
    }
  }
  if (atual.length) linhas.push(atual);
  return linhas;
}

/**
 * Reconstrói o texto de uma página como se fosse monoespaçado, convertendo
 * a coordenada x real de cada item numa coluna de caractere (x / charWidth
 * medida a partir dos próprios tokens da página). É isso que preserva o
 * alinhamento acorde-acima-da-sílaba quando o resultado passa pelo parser
 * de coluna (parseCifraClubTexto).
 */
function reconstruirLinhasDaPagina(items: ItemPosicionado[]): string[] {
  if (items.length === 0) return [];

  const larguras = items
    .filter((it) => it.str.trim())
    .map((it) => it.width / it.str.length)
    .sort((a, b) => a - b);
  const charWidth = larguras[Math.floor(larguras.length / 2)] || 7; // mediana; fallback defensivo

  const baseX = Math.min(...items.map((it) => it.x));
  const linhas = agruparPorLinha(items);

  return linhas
    .map((linha) => {
      let texto = '';
      for (const it of [...linha].sort((a, b) => a.x - b.x)) {
        const col = Math.round((it.x - baseX) / charWidth);
        if (texto.length < col) texto = texto.padEnd(col, ' ');
        texto = texto.slice(0, col) + it.str + texto.slice(col + it.str.length);
      }
      return texto;
    })
    .filter((linha) => {
      const trimmed = linha.trim();
      return !LINHA_RODAPE_PAGINA.test(trimmed) && !LINHA_CABECALHO_DATA.test(trimmed);
    });
}

function colunaMaisProxima(col: number, candidatos: number[]): number {
  let melhor = candidatos[0];
  let menorDist = Math.abs(col - melhor);
  for (const c of candidatos) {
    const dist = Math.abs(col - c);
    if (dist < menorDist) {
      melhor = c;
      menorDist = dist;
    }
  }
  return melhor;
}

/**
 * Corrige a coluna de cada acorde pra bater exatamente com o início de uma
 * palavra real da linha de letra abaixo. Necessário porque a conversão de
 * coordenada x contínua do PDF pra coluna de caractere discreta (ver
 * reconstruirTexto) é uma estimativa — pequenos erros de arredondamento
 * (~meio caractere) fazem o acorde cair 1 coluna cedo/tarde, no meio da
 * palavra (ex: "T[D]ODOS" em vez de "[D]TODOS"). Sem isso o parser de
 * coluna (parseCifraClubTexto, pensado pra texto HTML com colunas exatas)
 * herdaria essa imprecisão.
 */
function realinharAcordesComLetra(linhaAcordes: string, linhaLetra: string): string {
  const colunasPalavras: number[] = [];
  const rePalavra = /\S+/g;
  let mp: RegExpExecArray | null;
  while ((mp = rePalavra.exec(linhaLetra))) colunasPalavras.push(mp.index);
  if (colunasPalavras.length === 0) return linhaAcordes;

  const brutos: { col: number; token: string }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(linhaAcordes))) brutos.push({ col: m.index, token: m[0] });
  // não reposiciona tokens de grupo alternativo "(...)" (ex: "(A G#)") — o
  // realinhamento tende a colar eles no acorde vizinho sem espaço entre os
  // dois, e como serão descartados de qualquer forma em montarLinhaChordPro
  // (ver marcarGrupoAlternativo), o mais simples é já não escrevê-los aqui
  const marcados = marcarGrupoAlternativo(brutos.map((p) => p.token));
  const tokens = brutos.filter((_, i) => !marcados[i]);

  let saida = '';
  for (const { col, token } of tokens) {
    let alvo = colunaMaisProxima(col, colunasPalavras);
    // evita colar num token já colocado (colisão rara quando dois acordes
    // do PDF caem perto o bastante pra mirar a mesma palavra) — exige uma
    // coluna de espaço tanto na própria extensão quanto logo antes, senão
    // dois tokens ficam grudados sem espaço e viram um "\S+" só depois
    while (
      saida.slice(alvo, alvo + token.length).trim() ||
      (alvo > 0 && saida[alvo - 1] !== undefined && saida[alvo - 1] !== ' ')
    ) {
      alvo++;
    }
    if (saida.length < alvo) saida = saida.padEnd(alvo, ' ');
    saida = saida.slice(0, alvo) + token + saida.slice(alvo + token.length);
  }
  return saida;
}

/**
 * Passa por todas as linhas reconstruídas realinhando cada linha de
 * acordes com a linha de letra logo abaixo (quando houver).
 */
function realinharTodasAsLinhas(linhas: string[]): string[] {
  return linhas.map((linha, i) => {
    if (!pareceLinhaDeAcordes(linha)) return linha;
    const proxima = linhas[i + 1];
    if (!proxima || !proxima.trim() || pareceLinhaDeAcordes(proxima)) return linha;
    return realinharAcordesComLetra(linha, proxima);
  });
}

export interface ResultadoExtracaoPdf {
  chordsContent: string;
  lyrics: string;
}

function ehTextItem(it: TextItem | TextMarkedContent): it is TextItem {
  return 'str' in it;
}

export async function extrairCifraDoPdf(bytes: Uint8Array): Promise<ResultadoExtracaoPdf> {
  const doc = await pdfjsLib.getDocument({
    data: bytes,
    disableFontFace: true,
  }).promise;

  const todasAsLinhas: string[] = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      try {
        const content = await page.getTextContent();
        const items: ItemPosicionado[] = content.items
          .filter(ehTextItem)
          .filter((it) => it.str.trim().length > 0)
          .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], width: it.width }));
        todasAsLinhas.push(...reconstruirLinhasDaPagina(items));
      } finally {
        page.cleanup();
      }
    }
  } finally {
    await doc.destroy();
  }

  const linhasRealinhadas = realinharTodasAsLinhas(todasAsLinhas);
  const chordsContent = parseCifraClubTexto(linhasRealinhadas.join('\n'));
  const lyrics = extractLyrics(chordsContent);

  return { chordsContent, lyrics };
}
