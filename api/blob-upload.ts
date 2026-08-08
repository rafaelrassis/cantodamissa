import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

// Body é o arquivo bruto (binário) — desliga o parser automático (que só
// entende json/urlencoded/text) e lê os bytes crus manualmente abaixo.
export const config = {
  api: { bodyParser: false },
};

const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const TAMANHO_MAX_BYTES = 15 * 1024 * 1024; // 15MB

/**
 * Recebe o arquivo bruto no corpo (Content-Type do arquivo) e um header
 * `x-filename` com o nome original. Requer BLOB_READ_WRITE_TOKEN
 * configurado no projeto Vercel (Storage → Blob → Connect).
 *
 * Usa a assinatura legada (request, response) do @vercel/node — ver
 * comentário em api/cifraclub-import.ts sobre por que a assinatura
 * Web-padrão (Request) => Response não funciona aqui.
 *
 * Sem verificação de admin de verdade aqui (só fake-auth no cliente, ver
 * migration 0005) — qualquer um com a URL desse endpoint pode subir
 * arquivo. Aceitável enquanto o painel não tem uso público, mas é a
 * lacuna de segurança mais séria dessa feature; endereçar junto do OAuth
 * admin (Fase 2, ver SPEC.md).
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const contentTypeHeader = request.headers['content-type'];
  const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader ?? '';
  if (!TIPOS_PERMITIDOS.includes(contentType)) {
    response.status(415).json({ error: `Tipo de arquivo não aceito: ${contentType}` });
    return;
  }

  const filenameHeader = request.headers['x-filename'];
  const filename = (Array.isArray(filenameHeader) ? filenameHeader[0] : filenameHeader) || `cifra-${Date.now()}`;

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
    const blob = await put(`cifras/${Date.now()}-${filename}`, body, {
      access: 'public',
      contentType,
    });
    response.status(200).json({ url: blob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    response.status(500).json({ error: `Falha no upload: ${message}` });
  }
}
