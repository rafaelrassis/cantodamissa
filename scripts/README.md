# Importação de Cifras — Pipeline

## O que já existe

- `scripts/extract_cifra_pdf.py` — extrai título, artista, tom e cifra em
  formato ChordPro a partir de um PDF com camada de texto real (padrão
  Cifra Club é o mais comum). Preserva o alinhamento acorde↔sílaba usando
  as coordenadas x/y reais do PDF, não regex ingênua em texto plano.
- `supabase/seeds/0001_deus_e_10.sql` — exemplo de música já extraída e
  pronta como INSERT, extraída de um PDF real do Drive do usuário.

## Como usar

```bash
pip install pdfplumber --break-system-packages
python3 scripts/extract_cifra_pdf.py caminho/para/cifra.pdf
```

Saída: cabeçalho comentado (`# título:`, `# artista:`, `# tom:`) seguido do
`chordsContent` em ChordPro puro, pronto pra colar num INSERT ou popular via
`musicasApi`.

## Limitações conhecidas (testado contra a pasta real do usuário)

1. **PDFs sem camada de texto** (exportados como "print de tela" — sem
   `page.chars`, só `page.images`/`page.curves`): o script não extrai nada.
   Precisam de OCR (ex: `pytesseract` sobre a imagem renderizada da página)
   ou digitação manual. Sinal pra detectar: `extract_text()` retorna vazio.
2. **Formato "Músicas para Missa"**: acorde e letra já vêm quase na mesma
   linha (sem separação clara chord-line/lyric-line). O script atual assume
   o padrão Cifra Club (linha de acorde, depois linha de letra). Funciona,
   mas com alinhamento por linha em vez de por sílaba exata.
3. **Arquivos .docx**: não passam pelo `extract_cifra_pdf.py` (é PDF-only).
   Precisa de um parser separado (`python-docx` ou `mammoth`), ainda não
   escrito.

## Próximo passo pra processar o resto da pasta do Drive

1. Baixar os PDFs restantes (2019–2026 + "Louvor" + hinário) para uma pasta
   local.
2. Rodar o script em lote (loop `for f in *.pdf`), separando automaticamente
   os que retornam `chordsContent` vazio (candidatos a OCR).
3. Revisar manualmente os casos de baixa confiança antes de popular o banco
   de produção — o parser é heurístico, não 100% garantido pra formatos
   nunca vistos.
