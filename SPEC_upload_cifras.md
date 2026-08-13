# Upload de cifras — refino (ago/2026)

## Problema
Blob (Vercel Blob) instável quebrando o fluxo de upload em massa. Maioria das
cifras do cliente vem do Cifra Club, disponíveis como PDF ou por URL.

## Mudança
`src/components/BulkUploadCifraModal.tsx` ganhou dois fluxos:

### 1. URL do Cifra Club (novo, caminho preferencial)
- Textarea pra colar várias URLs (uma por linha), validadas por regex
  `cifraclub.com.br`.
- Cada URL chama `POST /api/cifraclub-import` (já existente) — raspa o
  `<pre>` da página e converte pra ChordPro via `parseCifraClubTexto`.
- **Sem blob, sem PDF, sem OCR** — extração direto do HTML estruturado do
  site, mais confiável que extração de PDF.
- `sourceFileUrl` da música criada = a própria URL do Cifra Club (referência
  melhor que um blob armazenado).

### 2. Arquivo (PDF/imagem/zip) — fluxo existente, blob virou opcional
- PDF continua sendo extraído via `/api/cifra-pdf-extract` (extração por
  coordenadas, só funciona com camada de texto real).
- Blob (`/api/blob-upload`) agora é **best-effort**: se falhar, a música
  ainda é criada normalmente (sem `sourceFileUrl`), só mostra aviso.
- Só falha o item de fato se não tiver cifra extraída **e** o blob também
  falhar (nada pra salvar).

## Dedup
`chaveMusica(título, cantor)` continua valendo pros dois fluxos juntos —
evita duplicar se a mesma música vier por URL e por PDF no mesmo lote.

## Validado
- `npx tsc -b` — sem erros
- `npx vite build` — build ok

## Risco em aberto
`cifraclub-import.ts` depende de seletores HTML (`h1.t1`, `<pre>`) do Cifra
Club. Se o site mudar layout, a extração degrada silenciosamente pro
fallback de erro — sem alerta automático de falha em massa.
