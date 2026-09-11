import { supabase } from './supabase';

// No Android o app roda em https://localhost (ver capacitor.config.ts),
// então caminho relativo cairia no próprio WebView em vez do servidor.
// VITE_API_BASE_URL aponta pro domínio de produção nesses builds; na web
// fica vazio e o caminho relativo continua valendo.
const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

/** Endereço final de uma rota /api, levando a base em conta. */
export function urlApi(caminho: string): string {
  return caminho.startsWith('/') ? `${BASE}${caminho}` : caminho;
}

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

  return fetch(urlApi(caminho), { ...init, headers });
}
