"""
Extrai cifras de PDFs (padrão Cifra Club / Músicas para Missa) para o formato
ChordPro usado pelo Canto da Missa, preservando o alinhamento real
acorde -> palavra via coordenadas x/y do PDF (não por regex ingênua no texto).

Uso:
    python3 extract_cifra_pdf.py entrada.pdf > saida.chordpro

Limitações conhecidas (v1):
- Assume que cada linha de acordes é seguida por uma linha de letra (padrão
  Cifra Club). PDFs com layout diferente podem precisar de ajuste manual.
- Ignora diagramas de acorde (tablatura/dedilhado) no rodapé — não são
  necessários pro chordsContent, o app gera diagrama a partir de um dataset
  próprio (ver decisão de produto).
- Ignora o rodapé de créditos/URL do Cifra Club.
"""

import re
import sys
import pdfplumber

# "M" no fim (ex: "G7M") é a notação brasileira de sétima maior, equivalente
# a "maj7" com a ordem número-letra invertida.
CHORD_TOKEN = re.compile(
    r'^[A-G](#|b)?(m|maj|min|dim|aug|sus)?[0-9]*M?(\([^)]*\))?(/[A-G](#|b)?)?$'
)

SECTION_MARKER = re.compile(r'^\[.+\]$')  # ex: "[Intro]", "[Refrão]"

LINHAS_IGNORAR = re.compile(
    r'^(Cifra Club|Tom:|Afinação:|Composição de:|https?://)', re.IGNORECASE
)

# linha de afinação tipo "E A D G B E" — 5 a 7 notas soltas, sem letra
TUNING_LINE = re.compile(r'^([A-G](#|b)?\s*){5,7}$')

# linha de diagrama de dedilhado: só números/traços (ex: "1 2 3", "4ª")
DIGIT_LINE = re.compile(r'^[\dªx\s]+$')


def eh_token_acorde(texto: str) -> bool:
    """Heurística: token curto que bate com o padrão de acorde musical."""
    limpo = texto.strip('()')
    if not limpo:
        return False
    return bool(CHORD_TOKEN.match(limpo))


def agrupar_por_linha(words, tolerancia=2.5):
    """Agrupa palavras do pdfplumber em linhas pela coordenada `top`."""
    linhas = []
    atual = []
    top_atual = None
    for w in sorted(words, key=lambda w: (w['top'], w['x0'])):
        if top_atual is None or abs(w['top'] - top_atual) <= tolerancia:
            atual.append(w)
            top_atual = w['top'] if top_atual is None else top_atual
        else:
            linhas.append(atual)
            atual = [w]
            top_atual = w['top']
    if atual:
        linhas.append(atual)
    return linhas


def linha_eh_de_acordes(linha_palavras) -> bool:
    """Considera linha de acordes se >=70% dos tokens (ignorando marcadores
    de seção tipo [Intro]) parecem acorde."""
    if not linha_palavras:
        return False
    relevantes = [w for w in linha_palavras if not SECTION_MARKER.match(w['text'])]
    if not relevantes:
        return False
    validos = sum(1 for w in relevantes if eh_token_acorde(w['text']))
    return validos / len(relevantes) >= 0.7


def montar_linha_chordpro(chords_linha, lyric_linha) -> str:
    """
    Insere cada acorde na posição textual correta da linha de letra,
    usando a coordenada x0 mais próxima (menor x0 de acorde <= x0 da palavra
    de letra que vem em seguida).
    """
    if not lyric_linha:
        # linha só de acordes (ex: intro instrumental) — sem letra pra ancorar
        partes = []
        for w in chords_linha:
            if SECTION_MARKER.match(w['text']):
                partes.append(w['text'])  # já é um marcador tipo "[Intro]"
            else:
                partes.append(f'[{w["text"]}]')
        return ' '.join(partes)

    palavras = [w['text'] for w in lyric_linha]
    posicoes_palavra = [w['x0'] for w in lyric_linha]

    # pra cada acorde, acha o índice da palavra de letra em que ele deve ser inserido
    insercoes = {}  # índice da palavra -> lista de acordes antes dela
    for chord in chords_linha:
        cx = chord['x0']
        idx_alvo = 0
        for i, px in enumerate(posicoes_palavra):
            if px <= cx:
                idx_alvo = i
            else:
                break
        insercoes.setdefault(idx_alvo, []).append(chord['text'])

    partes = []
    for i, palavra in enumerate(palavras):
        if i in insercoes:
            for c in insercoes[i]:
                partes.append(f'[{c}]')
        partes.append(palavra)
        partes.append(' ')
    return ''.join(partes).rstrip()


def extrair_cabecalho(linhas_texto):
    """Extrai título/artista/tom das primeiras linhas de texto puro (heurística).
    Padrão observado: linha 0 = título, linha 1 = artista/comunidade,
    linha seguinte pode ser "Composição de: ...", depois "Tom: X"."""
    titulo = linhas_texto[0].strip() if len(linhas_texto) > 0 else None
    artista = linhas_texto[1].strip() if len(linhas_texto) > 1 else None
    if artista and artista.lower().startswith(('composição de', 'tom:', 'afinação')):
        artista = None
    tom = None
    for linha in linhas_texto[:8]:
        m_tom = re.match(r'^Tom:\s*(.+)$', linha.strip())
        if m_tom:
            tom = m_tom.group(1).strip()
        m_cifraclub = re.match(r'^Cifra Club\s*-\s*(.+?)\s*-\s*(.+)$', linha.strip())
        if m_cifraclub:
            artista = m_cifraclub.group(1).strip()
            titulo = m_cifraclub.group(2).strip()
    return titulo, artista, tom


def processar_pdf(caminho: str) -> dict:
    with pdfplumber.open(caminho) as pdf:
        texto_completo = '\n'.join(p.extract_text() or '' for p in pdf.pages)
        linhas_texto = [l for l in texto_completo.split('\n') if l.strip()]
        titulo, artista, tom = extrair_cabecalho(linhas_texto)

        chordpro_linhas = []
        for page in pdf.pages:
            words = page.extract_words(use_text_flow=False, keep_blank_chars=False)
            linhas = agrupar_por_linha(words)

            corpo_iniciado = False
            i = 0
            while i < len(linhas):
                linha = linhas[i]
                texto_linha = ' '.join(w['text'] for w in linha).strip()

                if TUNING_LINE.match(texto_linha):
                    i += 1
                    continue

                if LINHAS_IGNORAR.match(texto_linha):
                    i += 1
                    continue

                if not corpo_iniciado:
                    # ainda no cabeçalho (título, compositor etc.) — só começa
                    # a capturar quando encontrar a primeira linha real de acordes
                    if linha_eh_de_acordes(linha):
                        corpo_iniciado = True
                    else:
                        i += 1
                        continue

                # detecta início do bloco de diagramas de dedilhado no rodapé:
                # linha de acordes (legenda) seguida de linha só de números
                if linha_eh_de_acordes(linha):
                    proxima_texto = (
                        ' '.join(w['text'] for w in linhas[i + 1]).strip()
                        if i + 1 < len(linhas)
                        else ''
                    )
                    if DIGIT_LINE.match(proxima_texto) and proxima_texto:
                        break  # resto da página é diagrama — ignora

                    proxima = linhas[i + 1] if i + 1 < len(linhas) else []
                    proxima_texto_bruto = ' '.join(w['text'] for w in proxima).strip()
                    if (
                        proxima
                        and not linha_eh_de_acordes(proxima)
                        and not LINHAS_IGNORAR.match(proxima_texto_bruto)
                        and not DIGIT_LINE.match(proxima_texto_bruto)
                    ):
                        chordpro_linhas.append(montar_linha_chordpro(linha, proxima))
                        i += 2
                    else:
                        chordpro_linhas.append(montar_linha_chordpro(linha, []))
                        i += 1
                elif DIGIT_LINE.match(texto_linha):
                    i += 1
                    continue
                else:
                    if texto_linha:
                        chordpro_linhas.append(texto_linha)
                    i += 1

    return {
        'titulo': titulo,
        'artista': artista,
        'tom': tom,
        'chordsContent': '\n'.join(chordpro_linhas),
    }


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Uso: python3 extract_cifra_pdf.py arquivo.pdf', file=sys.stderr)
        sys.exit(1)

    resultado = processar_pdf(sys.argv[1])
    print(f"# título: {resultado['titulo']}")
    print(f"# artista: {resultado['artista']}")
    print(f"# tom: {resultado['tom']}")
    print()
    print(resultado['chordsContent'])
