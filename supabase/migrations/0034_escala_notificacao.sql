-- ==========================================================
-- Marca quando o push da escala publicada já foi enviado
-- ==========================================================
-- O aviso de "você foi escalado" sai do aparelho do admin que publicou
-- (ver api/notificar-escala.ts). Sem uma marca no banco, cada gravação
-- da mesma escala — ou dois admins salvando junto — tocaria o celular de
-- todo mundo de novo.
--
-- Só o servidor escreve aqui (service role); a coluna é ignorada pelo
-- app, que nem a lê.
--
-- Limitação conhecida: quem for escalado depois do primeiro envio não
-- recebe push (a escala já está marcada). Notificar só os novos exigiria
-- guardar quem já foi avisado, o que não se paga enquanto a escala é
-- montada de uma vez e publicada no fim.

alter table public.escalas
  add column if not exists notificacao_enviada_em timestamptz;
