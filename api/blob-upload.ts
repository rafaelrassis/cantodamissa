import { put } from '@vercel/blob';

export const config = { runtime: 'nodejs' };

const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const TAMANHO_MAX_BYTES = 15 * 1024 * 1024; // 15MB

/**
 * Recebe o arquivo bruto no corpo (Content-Type do arquivo) e um header
 * `x-filename` com o nome original. Requer BLOB_READ_WRITE_TOKEN
 * configurado no projeto Vercel (Storage → Blob → Connect).
 *
 * Sem verificação de admin de verdade aqui (só fake-auth no cliente, ver
 * migration 0005) — qualquer um com a URL desse endpoint pode subir
 * arquivo. Aceitável enquanto o painel não tem uso público, mas é a
 * lacuna de segurança mais séria dessa feature; endereçar junto do OAuth
 * admin (Fase 2, ver SPEC.md).
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  }

  const contentType = req.headers.get('content-type') ?? '';
  if (!TIPOS_PERMITIDOS.includes(contentType)) {
    return new Response(
      JSON.stringify({ error: `Tipo de arquivo não aceito: ${contentType}` }),
      { status: 415 }
    );
  }

  const filename = req.headers.get('x-filename') || `cifra-${Date.now()}`;

  const body = await req.arrayBuffer();
  if (body.byteLength > TAMANHO_MAX_BYTES) {
    return new Response(JSON.stringify({ error: 'Arquivo maior que 15MB' }), { status: 413 });
  }

  try {
    const blob = await put(`cifras/${Date.now()}-${filename}`, body, {
      access: 'public',
      contentType,
    });
    return new Response(JSON.stringify({ url: blob.url }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: `Falha no upload: ${message}` }), { status: 500 });
  }
}
