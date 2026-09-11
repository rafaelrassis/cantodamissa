import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clienteServico, enviarPush, pushConfigurado, tokensDe, usuarioDoToken } from './_push.js';

/**
 * Avisa por push quem foi escalado que a escala saiu.
 *
 * Chamado pelo aparelho do admin que publicou (ver useEscalas.ts), mas
 * conferido aqui: só envia se quem chamou for mesmo admin do ministério
 * dono da escala, e se a escala estiver publicada. Sem isso, qualquer
 * conta logada poderia fazer o app tocar o celular de um ministério
 * inteiro.
 *
 * `notificacao_enviada_em` (0034) garante uma notificação só por escala,
 * mesmo que a tela salve de novo ou dois admins publiquem junto.
 */

/** '2026-03-08' -> '08/03'; devolve o original se vier em outro formato. */
function formatarData(data: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  return partes ? `${partes[3]}/${partes[2]}` : data;
}

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

  const escalaId = String((request.body as { escalaId?: string } | undefined)?.escalaId ?? '').trim();
  if (!escalaId) {
    response.status(400).json({ error: 'Escala não informada.' });
    return;
  }

  const servico = clienteServico();

  const { data: escala } = await servico
    .from('escalas')
    .select('id, titulo, data, hora, publicada, ministerio_id, notificacao_enviada_em')
    .eq('id', escalaId)
    .maybeSingle();
  if (!escala) {
    response.status(404).json({ error: 'Escala não encontrada.' });
    return;
  }
  if (!escala.publicada) {
    response.status(400).json({ error: 'Escala ainda não publicada.' });
    return;
  }
  if (escala.notificacao_enviada_em) {
    response.status(200).json({ enviadas: 0, motivo: 'escala já notificada' });
    return;
  }

  const { data: quemChamou } = await servico
    .from('ministerio_membros')
    .select('id')
    .eq('ministerio_id', escala.ministerio_id)
    .eq('auth_uid', authUid)
    .eq('admin', true)
    .maybeSingle();
  if (!quemChamou) {
    response.status(403).json({ error: 'Só admin do ministério pode notificar a escala.' });
    return;
  }

  const [{ data: ministerio }, { data: participantes }] = await Promise.all([
    servico.from('ministerios').select('nome').eq('id', escala.ministerio_id).maybeSingle(),
    servico.from('escala_participantes').select('membro_id').eq('escala_id', escala.id),
  ]);

  const membroIds = (participantes ?? []).map((p: { membro_id: string }) => p.membro_id);
  if (membroIds.length === 0) {
    response.status(200).json({ enviadas: 0 });
    return;
  }

  const { data: membros } = await servico
    .from('ministerio_membros')
    .select('auth_uid')
    .in('id', membroIds)
    .not('auth_uid', 'is', null);

  const uids = (membros ?? []).map((m: { auth_uid: string | null }) => m.auth_uid as string);
  const tokens = await tokensDe(servico, uids, authUid);

  const enviadas = await enviarPush(servico, tokens, {
    titulo: ministerio?.nome ?? 'Ministério',
    corpo: `Você está escalado: ${escala.titulo} — ${formatarData(escala.data)} às ${String(
      escala.hora
    ).slice(0, 5)}.`,
    dados: { tipo: 'escala_publicada', escalaId: escala.id, ministerioId: escala.ministerio_id },
  });

  // Marca mesmo com zero envios: ninguém tinha aparelho registrado, e
  // reenviar depois avisaria de uma escala já velha.
  await servico
    .from('escalas')
    .update({ notificacao_enviada_em: new Date().toISOString() })
    .eq('id', escala.id);

  response.status(200).json({ enviadas });
}
