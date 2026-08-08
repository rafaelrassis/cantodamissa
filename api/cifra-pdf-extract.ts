import type { VercelRequest, VercelResponse } from '@vercel/node';
import { extrairCifraDoPdf } from '../src/lib/pdfCifraExtractor.js';

// Body é o PDF bruto (binário) — mesmo motivo de api/blob-upload.ts: o
// bodyParser padrão só entende json/urlencoded/text.
export const config = {
  api: { bodyParser: false },
};

const TAMANHO_MAX_BYTES = 15 * 1024 * 1024; // 15MB — mesmo limite de blob-upload.ts

/**
 * Recebe um PDF no corpo da requisição e devolve a cifra em ChordPro
 * extraída via alinhamento de coordenadas (ver src/lib/pdfCifraExtractor.ts).
 * Só funciona pra PDFs com camada de texto real — scans/fotos voltam com
 * chordsContent vazio, precisam de digitação manual.
 *
 * Sem verificação de admin de verdade aqui — mesma lacuna de segurança de
 * api/blob-upload.ts (ver comentário lá).
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const contentTypeHeader = request.headers['content-type'];
  const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader ?? '';
  if (contentType !== 'application/pdf') {
    response.status(415).json({ error: `Tipo de arquivo não aceito: ${contentType}` });
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }
  const body = Buffer.concat(chunks);

  if (body.byteLength > TAMANHO_MAX_BYTES) {
    response.status(413).json({ error: 'Arquivo maior que 15MB' });
    return;
  }

  try {
    const resultado = await extrairCifraDoPdf(new Uint8Array(body));
    response.status(200).json(resultado);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    response.status(500).json({ error: `Falha ao extrair cifra do PDF: ${message}` });
  }
}
