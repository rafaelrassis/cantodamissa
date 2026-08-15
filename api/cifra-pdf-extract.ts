import type { VercelRequest, VercelResponse } from '@vercel/node';
import { extrairCifraDoPdf } from '../src/lib/pdfCifraExtractor.js';
import { exigirAdmin } from './_auth.js';

// Body é o PDF bruto (binário): o bodyParser padrão só entende
// json/urlencoded/text.
export const config = {
  api: { bodyParser: false },
};

const TAMANHO_MAX_BYTES = 15 * 1024 * 1024; // 15MB

/**
 * Recebe um PDF no corpo da requisição e devolve a cifra em ChordPro
 * extraída via alinhamento de coordenadas (ver src/lib/pdfCifraExtractor.ts).
 * Só funciona pra PDFs com camada de texto real — scans/fotos voltam com
 * chordsContent vazio, precisam de digitação manual.
 *
 * Restrito a admin (ver _auth.ts): rodar pdf.js em arquivo de
 * desconhecido é trabalho pesado à custa da função serverless.
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido' });
    return;
  }

  if (!(await exigirAdmin(request, response))) return;

  const contentTypeHeader = request.headers['content-type'];
  const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader ?? '';
  if (contentType !== 'application/pdf') {
    response.status(415).json({ error: `Tipo de arquivo não aceito: ${contentType}` });
    return;
  }

  // O corte de tamanho acontece durante a leitura, não depois: acumular o
  // corpo inteiro pra só então medir significava que um upload de vários
  // GB estourava a memória da função antes de qualquer 413.
  const chunks: Buffer[] = [];
  let recebidos = 0;
  for await (const chunk of request) {
    const parte = chunk as Buffer;
    recebidos += parte.byteLength;
    if (recebidos > TAMANHO_MAX_BYTES) {
      request.destroy();
      response.status(413).json({ error: 'Arquivo maior que 15MB' });
      return;
    }
    chunks.push(parte);
  }
  const body = Buffer.concat(chunks);

  try {
    const resultado = await extrairCifraDoPdf(new Uint8Array(body));
    response.status(200).json(resultado);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    response.status(500).json({ error: `Falha ao extrair cifra do PDF: ${message}` });
  }
}
