import { pareceAcorde } from './chordpro';

/**
 * Parser de texto cru (padrão Cifra Club: linha de acordes em cima,
 * linha de letra embaixo, alinhados por coluna) para o formato ChordPro
 * usado no app: "[G]Como são belos os [Em]pés...".
 *
 * Mesma heurística do extrator de PDF em scripts/extract_cifra_pdf.py,
 * adaptada pra texto plano (posição por índice de caractere em vez de
 * coordenada x0 do PDF) — usada pela importação via link no admin.
 *
 * Limitação conhecida: como o HTML já vem sem tabulação/monoespaçamento
 * garantido em todo navegador, o alinhamento por coluna pode ficar
 * levemente impreciso em linhas muito longas. Revisar o resultado antes
 * de salvar é sempre recomendado — o form do admin deixa o campo editável.
 */

const SECTION_MARKER = /^\[.+\]$/; // ex: "[Intro]", "[Refrão]"

const LINHAS_IGNORAR =
  /^(Cifra Club|Tom:|Afinação:|Composição de:|Enviada por|Versão \d|https?:\/\/)/i;

// linha de afinação tipo "E A D G B E" — 5 a 7 notas soltas, sem letra
const TUNING_LINE = /^([A-G](#|b)?\s*){5,7}$/;

export function pareceLinhaDeAcordes(linha: string): boolean {
  const trimmed = linha.trim();
  if (!trimmed) return false;
  const tokens = trimmed.split(/\s+/).filter((t) => !SECTION_MARKER.test(t));
  if (tokens.length === 0) return false;
  const validos = tokens.filter((t) => pareceAcorde(t)).length;
  return validos / tokens.length >= 0.7;
}

/**
 * Insere cada acorde da linha de cima na posição de coluna correspondente
 * da linha de letra embaixo. Se não houver letra (ex: intro instrumental),
 * retorna só os acordes entre colchetes.
 */
function montarLinhaChordPro(linhaAcordes: string, linhaLetra: string | null): string {
  const posicoes: { col: number; token: string }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(linhaAcordes))) {
    posicoes.push({ col: m.index, token: m[0] });
  }

  if (!linhaLetra) {
    return posicoes
      .map(({ token }) => (SECTION_MARKER.test(token) ? token : `[${token}]`))
      .join(' ');
  }

  // insere do fim pro começo pra não invalidar os índices já calculados
  let resultado = linhaLetra;
  for (let i = posicoes.length - 1; i >= 0; i--) {
    const { col, token } = posicoes[i];
    if (SECTION_MARKER.test(token)) continue; // marcador de seção não se insere no meio da letra
    const idx = Math.min(col, resultado.length);
    resultado = `${resultado.slice(0, idx)}[${token}]${resultado.slice(idx)}`;
  }
  return resultado;
}

export function parseCifraClubTexto(textoBruto: string): string {
  const linhas = textoBruto.replace(/\r\n/g, '\n').split('\n');
  const saida: string[] = [];
  let corpoIniciado = false;

  let i = 0;
  while (i < linhas.length) {
    const linha = linhas[i];
    const trimmed = linha.trim();

    if (TUNING_LINE.test(trimmed) || LINHAS_IGNORAR.test(trimmed)) {
      i++;
      continue;
    }

    if (!corpoIniciado) {
      if (pareceLinhaDeAcordes(linha) || SECTION_MARKER.test(trimmed)) {
        corpoIniciado = true;
      } else {
        i++;
        continue;
      }
    }

    if (pareceLinhaDeAcordes(linha)) {
      const proxima = i + 1 < linhas.length ? linhas[i + 1] : null;
      if (proxima !== null && proxima.trim() && !pareceLinhaDeAcordes(proxima)) {
        saida.push(montarLinhaChordPro(linha, proxima));
        i += 2;
      } else {
        saida.push(montarLinhaChordPro(linha, null));
        i++;
      }
    } else {
      saida.push(linha);
      i++;
    }
  }

  return saida.join('\n').trim();
}
