import { supabase } from './supabase';

/**
 * `fetch` para as rotas /api do próprio projeto, com o token da sessão do
 * Supabase no header Authorization.
 *
 * Esses endpoints (importar cifra por link, extrair cifra de PDF) passaram
 * a exigir admin de verdade — ver api/_auth.ts. Sem o header eles
 * respondem 401, então toda chamada precisa passar por aqui.
 */
export async function fetchApi(caminho: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return fetch(caminho, { ...init, headers });
}
