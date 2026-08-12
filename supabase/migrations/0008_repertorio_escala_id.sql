-- Uma Escala do Ministério pode ganhar seu próprio repertório vinculado
-- (1 escala = no máximo 1 repertório). Repertórios continuam podendo ser
-- criados livremente também (sem escala) — essa coluna só guarda o vínculo
-- pro lado Supabase quando ele existe.
--
-- IMPORTANTE: sem FK de verdade porque o módulo Ministério (Escalas)
-- ainda é 100% mock em memória (useMinisterioMock/useState) — não existe
-- tabela `escalas` no banco ainda. `escala_id` guarda o id mockado
-- (`e<timestamp>`, gerado no cliente) só pra correlacionar; quando
-- Ministério for migrado pra Supabase de verdade, trocar por
-- `references escalas(id)` e fazer o backfill.
alter table repertorios
  add column if not exists escala_id text;

create index if not exists repertorios_escala_id_idx on repertorios (escala_id);
