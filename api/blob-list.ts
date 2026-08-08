import type { VercelRequest, VercelResponse } from '@vercel/node';
import { list } from '@vercel/blob';

const MAX_BLOBS = 5000;

/**
 * Lista arquivos já enviados ao Blob sob um prefixo (pasta). Pagina
 * automaticamente até MAX_BLOBS pra não estourar em pastas muito cheias.
 *
 * Sem verificação de admin de verdade aqui — mesma lacuna de segurança de
 * api/blob-upload.ts (ver comentário lá).
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const prefixParam = request.query.prefix;
  const prefix = (Array.isArray(prefixParam) ? prefixParam[0] : prefixParam) || 'cifra';

  try {
    const blobs: { url: string; pathname: string; size: number; uploadedAt: string }[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      blobs.push(
        ...page.blobs.map((b) => ({
          url: b.url,
          pathname: b.pathname,
          size: b.size,
          uploadedAt: b.uploadedAt.toString(),
        }))
      );
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor && blobs.length < MAX_BLOBS);

    blobs.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    response.status(200).json({ blobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    response.status(500).json({ error: `Falha ao listar arquivos: ${message}` });
  }
}
