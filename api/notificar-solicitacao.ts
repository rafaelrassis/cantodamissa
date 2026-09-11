import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clienteServico, enviarPush, pushConfigurado, tokensDe, usuarioDoToken } from './_push.js';

/**
 * Avisa por push os admins de um ministério que chegou uma solicitação de
 * ingresso — o alerta dentro do app só existe com o app aberto.
 *
 * Quem chama é o próprio aparelho que acabou de pedir ingresso, logo
 * depois da RPC `solicitar_ingresso` (ver ministerioApi.ts). Isso é
 * verificado, não confiado: o endpoint exige o token da sessão de quem
 * chamou e só envia se existir mesmo uma solicitação pendente dessa
 * conta no ministério daquele código — sem isso viraria um jeito de
 * qualquer um fazer o app tocar o celular de admins alheios.
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido.' });
    return;
  }
  if (!pushConfigurado()) {
    response.status(200).json({ enviadas: 0, motivo: 'push não configurado no servidor' });
    return;
  }

  const authUid = await usuarioDoToken(request);
  if (!authUid) {
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

  const servico = clienteServico();

  const { data: ministerio } = await servico
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
  const { data: solicitacao } = await servico
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

  const { data: admins } = await servico
    .from('ministerio_membros')
    .select('auth_uid')
    .eq('ministerio_id', ministerio.id)
    .eq('admin', true)
    .not('auth_uid', 'is', null);

  const uidsAdmins = (admins ?? []).map((m: { auth_uid: string | null }) => m.auth_uid as string);
  const tokens = await tokensDe(servico, uidsAdmins, authUid);

  const enviadas = await enviarPush(servico, tokens, {
    titulo: ministerio.nome,
    corpo: `${solicitacao.nome} pediu para entrar no ministério.`,
    dados: { tipo: 'solicitacao_ingresso', ministerioId: ministerio.id },
  });

  response.status(200).json({ enviadas });
}
