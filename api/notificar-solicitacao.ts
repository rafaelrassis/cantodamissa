import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createSign } from 'node:crypto';

/**
 * Avisa por push os admins de um ministério que chegou uma solicitação de
 * ingresso.
 *
 * Por que no servidor e não num trigger do banco: o envio precisa da
 * chave de serviço do Firebase, que não pode ficar no app nem no
 * Postgres, e a Vercel já é onde os segredos deste projeto moram.
 *
 * Quem chama é o próprio aparelho que acabou de pedir ingresso, logo
 * depois da RPC `solicitar_ingresso` (ver ministerioApi.ts). Isso é
 * verificado, não confiado: o endpoint exige o token da sessão de quem
 * chamou e só envia se existir mesmo uma solicitação pendente dessa
 * conta no ministério daquele código — sem isso viraria um jeito de
 * qualquer um fazer o app tocar o celular de admins alheios.
 *
 * Configuração necessária (variáveis de ambiente na Vercel):
 * - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — pra resolver o código,
 *   conferir a solicitação e ler os tokens (que a RLS esconde de todo
 *   mundo, de propósito: ver 0033);
 * - FIREBASE_SERVICE_ACCOUNT_JSON — o JSON da conta de serviço do
 *   projeto Firebase, colado inteiro.
 *
 * Sem elas o endpoint responde 200 com `{ enviadas: 0 }`: push é um
 * extra, e falhar aqui não pode quebrar o ingresso, que já foi gravado.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';
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

function base64url(valor: string | Buffer): string {
  return Buffer.from(valor).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Token OAuth do FCM guardado entre invocações: a função fica quente por
// alguns minutos e o token vale uma hora, então não faz sentido pedir um
// novo a cada solicitação.
let tokenCache: { valor: string; expiraEm: number } | null = null;

/** Troca a conta de serviço por um access_token (fluxo JWT bearer do Google). */
async function obterAccessToken(conta: ContaServico): Promise<string> {
  const agora = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.expiraEm > agora + 60) return tokenCache.valor;

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

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const conta = lerContaServico();
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !conta) {
    response.status(200).json({ enviadas: 0, motivo: 'push não configurado no servidor' });
    return;
  }

  const header = request.headers.authorization;
  const token = (Array.isArray(header) ? header[0] : header)?.replace(/^Bearer /i, '').trim();
  if (!token) {
    response.status(401).json({ error: 'É preciso estar logado.' });
    return;
  }

  const codigo = String((request.body as { codigo?: string } | undefined)?.codigo ?? '')
    .trim()
    .toUpperCase();
  if (!codigo) {
    response.status(400).json({ error: 'Código do convite ausente.' });
    return;
  }

  const comoUsuario = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: usuario } = await comoUsuario.auth.getUser(token);
  const authUid = usuario?.user?.id;
  if (!authUid) {
    response.status(401).json({ error: 'Sessão inválida.' });
    return;
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: ministerio } = await admin
    .from('ministerios')
    .select('id, nome')
    .eq('codigo_convite', codigo)
    .maybeSingle();
  if (!ministerio) {
    response.status(404).json({ error: 'Ministério não encontrado.' });
    return;
  }

  // É isto que impede o endpoint de virar campainha de graça: sem uma
  // solicitação pendente da própria conta, não há o que notificar.
  const { data: solicitacao } = await admin
    .from('solicitacoes_ingresso')
    .select('nome')
    .eq('ministerio_id', ministerio.id)
    .eq('auth_uid', authUid)
    .eq('status', 'pendente')
    .maybeSingle();
  if (!solicitacao) {
    response.status(403).json({ error: 'Nenhuma solicitação pendente sua neste ministério.' });
    return;
  }

  const { data: admins } = await admin
    .from('ministerio_membros')
    .select('auth_uid')
    .eq('ministerio_id', ministerio.id)
    .eq('admin', true)
    .not('auth_uid', 'is', null);

  const uids = (admins ?? []).map((m) => m.auth_uid as string);
  if (uids.length === 0) {
    response.status(200).json({ enviadas: 0 });
    return;
  }

  const { data: dispositivos } = await admin
    .from('dispositivos_push')
    .select('token')
    .in('auth_uid', uids);

  const tokens = (dispositivos ?? []).map((d) => d.token as string);
  if (tokens.length === 0) {
    response.status(200).json({ enviadas: 0 });
    return;
  }

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
            notification: {
              title: ministerio.nome,
              body: `${solicitacao.nome} pediu para entrar no ministério.`,
            },
            data: { tipo: 'solicitacao_ingresso', ministerioId: ministerio.id },
            android: { priority: 'HIGH', notification: { channel_id: 'ministerio' } },
          },
        }),
      });

      if (envio.status === 404 || envio.status === 400) {
        // Token de app desinstalado/reinstalado: some da tabela, senão
        // fica tentando pra sempre a cada nova solicitação.
        await admin.from('dispositivos_push').delete().eq('token', destino);
        return false;
      }
      return envio.ok;
    })
  );

  const enviadas = resultados.filter((r) => r.status === 'fulfilled' && r.value).length;
  response.status(200).json({ enviadas });
}
