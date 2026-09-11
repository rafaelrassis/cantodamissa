import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createSign } from 'node:crypto';

/**
 * Envio de push (FCM HTTP v1) compartilhado pelos endpoints de
 * notificação — solicitação de ingresso e escala publicada.
 *
 * Fica no servidor porque depende da chave de serviço do Firebase, que
 * não pode ir no app nem no Postgres. Configuração necessária na Vercel:
 * SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e FIREBASE_SERVICE_ACCOUNT_JSON
 * (ver README, "Notificações push").
 *
 * Sem essas variáveis `pushConfigurado()` devolve false e os endpoints
 * respondem 200 sem enviar nada: push é um extra, e falhar aqui não pode
 * quebrar a ação que já foi gravada no banco.
 *
 * Arquivos com prefixo "_" não viram rota na Vercel.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const CONTA_SERVICO = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? '';

type ContaServico = { client_email: string; private_key: string; project_id: string };

function lerContaServico(): ContaServico | null {
  if (!CONTA_SERVICO) return null;
  try {
    const conta = JSON.parse(CONTA_SERVICO) as ContaServico;
    if (!conta.client_email || !conta.private_key || !conta.project_id) return null;
    // A chave costuma ser colada com \n literais quando passa por painel
    // de env var; sem desfazer isso o sign falha com "PEM inválido".
    return { ...conta, private_key: conta.private_key.replace(/\\n/g, '\n') };
  } catch {
    return null;
  }
}

export function pushConfigurado(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY && lerContaServico());
}

/** Client com service role: os tokens são invisíveis por RLS de propósito (0033). */
export function clienteServico(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Devolve o auth.uid() de quem chamou, ou null se o token não valer. */
export async function usuarioDoToken(request: {
  headers: { authorization?: string | string[] };
}): Promise<string | null> {
  const header = request.headers.authorization;
  const token = (Array.isArray(header) ? header[0] : header)?.replace(/^Bearer /i, '').trim();
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const { data } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getUser(token);
  return data?.user?.id ?? null;
}

/** Tokens dos aparelhos dessas contas (sem os de `exceto`, normalmente quem disparou). */
export async function tokensDe(
  servico: SupabaseClient,
  authUids: string[],
  exceto?: string
): Promise<string[]> {
  const alvos = authUids.filter((uid) => uid && uid !== exceto);
  if (alvos.length === 0) return [];
  const { data } = await servico.from('dispositivos_push').select('token').in('auth_uid', alvos);
  return (data ?? []).map((d) => d.token as string);
}

// Token OAuth guardado entre invocações: a função fica quente por alguns
// minutos e o token vale uma hora, então não faz sentido pedir um novo a
// cada notificação.
let tokenCache: { valor: string; expiraEm: number } | null = null;

/** Troca a conta de serviço por um access_token (fluxo JWT bearer do Google). */
async function obterAccessToken(conta: ContaServico): Promise<string> {
  const agora = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.expiraEm > agora + 60) return tokenCache.valor;

  const base64url = (valor: string | Buffer) =>
    Buffer.from(valor).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const cabecalho = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corpo = base64url(
    JSON.stringify({
      iss: conta.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: agora,
      exp: agora + 3600,
    })
  );
  const assinatura = base64url(
    createSign('RSA-SHA256').update(`${cabecalho}.${corpo}`).sign(conta.private_key)
  );

  const resposta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${cabecalho}.${corpo}.${assinatura}`,
    }),
  });
  if (!resposta.ok) throw new Error(`OAuth do Firebase falhou: ${resposta.status}`);

  const dados = (await resposta.json()) as { access_token: string; expires_in: number };
  tokenCache = { valor: dados.access_token, expiraEm: agora + dados.expires_in };
  return dados.access_token;
}

export type Notificacao = {
  titulo: string;
  corpo: string;
  dados?: Record<string, string>;
};

/**
 * Envia a mesma notificação pra vários aparelhos e devolve quantas foram
 * aceitas. Token recusado pelo FCM (app desinstalado, reinstalado) é
 * apagado na hora — senão fica sendo tentado pra sempre.
 */
export async function enviarPush(
  servico: SupabaseClient,
  tokens: string[],
  notificacao: Notificacao
): Promise<number> {
  const conta = lerContaServico();
  if (!conta || tokens.length === 0) return 0;

  const accessToken = await obterAccessToken(conta);
  const url = `https://fcm.googleapis.com/v1/projects/${conta.project_id}/messages:send`;

  const resultados = await Promise.allSettled(
    tokens.map(async (destino) => {
      const envio = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token: destino,
            notification: { title: notificacao.titulo, body: notificacao.corpo },
            data: notificacao.dados ?? {},
            android: { priority: 'HIGH', notification: { channel_id: 'ministerio' } },
          },
        }),
      });

      if (envio.status === 404 || envio.status === 400) {
        await servico.from('dispositivos_push').delete().eq('token', destino);
        return false;
      }
      return envio.ok;
    })
  );

  return resultados.filter((r) => r.status === 'fulfilled' && r.value).length;
}
