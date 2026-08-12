-- ==========================================================
-- RLS de verdade pro Ministério: escrita restrita a admin.
-- ==========================================================
-- Pré-requisito: o app agora abre uma sessão anônima do Supabase Auth
-- por dispositivo (ver src/lib/supabaseAuth.ts) — sem isso, checar
-- "é admin?" contra dado enviado pelo próprio cliente não vale nada,
-- porque a chave pública é... pública. auth_uid vem do JWT assinado
-- pelo Supabase, então é confiável dentro de uma policy.
--
-- device_key continua existindo (é o identificador usado hoje em todo o
-- app) — auth_uid é só o elo confiável entre "essa sessão" e "essa linha
-- de membro". Linhas antigas (criadas antes desta migração) nascem com
-- auth_uid nulo; o próprio app faz o vínculo na primeira vez que abre
-- (self-heal, ver buscarMeuMinisterio em ministerioApi.ts). Isso deixa
-- uma janela estreita: até o dono de verdade abrir o app depois do
-- deploy, uma linha de membro legado "sem dono" pode ser reivindicada
-- por qualquer sessão. Com poucos membros de teste hoje, o risco é baixo
-- — mas vale reabrir o ministério de produção uma vez em cada
-- device/membro real logo depois de aplicar esta migração.

alter table public.ministerio_membros add column if not exists auth_uid uuid;
create index if not exists idx_membros_auth_uid on public.ministerio_membros (auth_uid);

alter table public.solicitacoes_ingresso add column if not exists auth_uid uuid;

-- ----------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------
create or replace function public.eh_admin(p_ministerio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ministerio_membros
    where ministerio_id = p_ministerio_id
      and auth_uid = auth.uid()
      and admin = true
  );
$$;

create or replace function public.meu_membro_id(p_ministerio_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.ministerio_membros
  where ministerio_id = p_ministerio_id and auth_uid = auth.uid()
  limit 1;
$$;

-- admin do ministério dono de uma escala
create or replace function public.eh_admin_da_escala(p_escala_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.eh_admin(ministerio_id) from public.escalas where id = p_escala_id;
$$;

-- admin do ministério dono de um repertório vinculado a uma escala;
-- repertório avulso (sem escala, feature "Meus Repertórios") continua
-- liberado — não é ministério-scoped.
create or replace function public.pode_editar_repertorio(p_repertorio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when r.escala_id is null then true
    else coalesce(public.eh_admin((select ministerio_id from public.escalas where id::text = r.escala_id)), false)
  end
  from public.repertorios r where r.id = p_repertorio_id;
$$;

-- ----------------------------------------------------------
-- ministerios: criar é livre (self-service); renomear/regenerar
-- código/excluir só admin.
-- ----------------------------------------------------------
drop policy if exists "acesso público temporário — ministerios (sem auth ainda)" on public.ministerios;
create policy "ministerios_select_publico" on public.ministerios for select using (true);
create policy "ministerios_insert_livre" on public.ministerios for insert with check (true);
create policy "ministerios_admin_altera" on public.ministerios for update using (public.eh_admin(id)) with check (public.eh_admin(id));
create policy "ministerios_admin_exclui" on public.ministerios for delete using (public.eh_admin(id));

-- ----------------------------------------------------------
-- ministerio_membros: leitura pública (precisa pra achar "meu membro"
-- antes de existir vínculo); inserir é livre pro próprio auth_uid
-- (cria-se a si mesmo ao fundar ou entrar) ou admin criando outro membro
-- (aprovar solicitação); alterar/excluir é admin — com duas exceções:
-- o próprio membro pode sair (excluir a si mesmo) e pode vincular seu
-- auth_uid uma única vez (linha legada, auth_uid ainda nulo).
-- ----------------------------------------------------------
drop policy if exists "acesso público temporário — ministerio_membros (sem auth ainda)" on public.ministerio_membros;
create policy "membros_select_publico" on public.ministerio_membros for select using (true);
create policy "membros_insert_self_ou_admin" on public.ministerio_membros
  for insert with check (auth_uid = auth.uid() or public.eh_admin(ministerio_id));
create policy "membros_admin_altera" on public.ministerio_membros
  for update using (public.eh_admin(ministerio_id)) with check (public.eh_admin(ministerio_id));
create policy "membros_vincula_auth_uid_legado" on public.ministerio_membros
  for update using (auth_uid is null) with check (auth_uid = auth.uid());
create policy "membros_admin_remove" on public.ministerio_membros
  for delete using (public.eh_admin(ministerio_id));
create policy "membros_sai_sozinho" on public.ministerio_membros
  for delete using (auth_uid = auth.uid());

-- ----------------------------------------------------------
-- solicitacoes_ingresso: pedir pra entrar é livre (ainda não é membro);
-- aprovar/recusar (delete) é admin.
-- ----------------------------------------------------------
drop policy if exists "acesso público temporário — solicitacoes_ingresso (sem auth ainda)" on public.solicitacoes_ingresso;
create policy "solicitacoes_select_publico" on public.solicitacoes_ingresso for select using (true);
create policy "solicitacoes_insert_livre" on public.solicitacoes_ingresso for insert with check (true);
create policy "solicitacoes_admin_resolve" on public.solicitacoes_ingresso for delete using (public.eh_admin(ministerio_id));

-- ----------------------------------------------------------
-- funcoes / membro_funcoes / avisos / equipes / equipe_membros /
-- modelos_roteiro / modelo_roteiro_itens / escalas / roteiro_itens:
-- leitura pública, escrita só admin.
-- ----------------------------------------------------------
drop policy if exists "acesso público temporário — funcoes (sem auth ainda)" on public.funcoes;
create policy "funcoes_select_publico" on public.funcoes for select using (true);
create policy "funcoes_admin_escreve" on public.funcoes for all using (public.eh_admin(ministerio_id)) with check (public.eh_admin(ministerio_id));

drop policy if exists "acesso público temporário — membro_funcoes (sem auth ainda)" on public.membro_funcoes;
create policy "membro_funcoes_select_publico" on public.membro_funcoes for select using (true);
create policy "membro_funcoes_admin_escreve" on public.membro_funcoes for all
  using (public.eh_admin((select ministerio_id from public.funcoes where id = membro_funcoes.funcao_id)))
  with check (public.eh_admin((select ministerio_id from public.funcoes where id = membro_funcoes.funcao_id)));

drop policy if exists "acesso público temporário — avisos (sem auth ainda)" on public.avisos;
create policy "avisos_select_publico" on public.avisos for select using (true);
create policy "avisos_admin_escreve" on public.avisos for all using (public.eh_admin(ministerio_id)) with check (public.eh_admin(ministerio_id));

drop policy if exists "acesso público temporário — equipes (sem auth ainda)" on public.equipes;
create policy "equipes_select_publico" on public.equipes for select using (true);
create policy "equipes_admin_escreve" on public.equipes for all using (public.eh_admin(ministerio_id)) with check (public.eh_admin(ministerio_id));

drop policy if exists "acesso público temporário — equipe_membros (sem auth ainda)" on public.equipe_membros;
create policy "equipe_membros_select_publico" on public.equipe_membros for select using (true);
create policy "equipe_membros_admin_escreve" on public.equipe_membros for all
  using (public.eh_admin((select ministerio_id from public.equipes where id = equipe_membros.equipe_id)))
  with check (public.eh_admin((select ministerio_id from public.equipes where id = equipe_membros.equipe_id)));

drop policy if exists "acesso público temporário — modelos_roteiro (sem auth ainda)" on public.modelos_roteiro;
create policy "modelos_roteiro_select_publico" on public.modelos_roteiro for select using (true);
create policy "modelos_roteiro_admin_escreve" on public.modelos_roteiro for all using (public.eh_admin(ministerio_id)) with check (public.eh_admin(ministerio_id));

drop policy if exists "acesso público temporário — modelo_roteiro_itens (sem auth ainda)" on public.modelo_roteiro_itens;
create policy "modelo_roteiro_itens_select_publico" on public.modelo_roteiro_itens for select using (true);
create policy "modelo_roteiro_itens_admin_escreve" on public.modelo_roteiro_itens for all
  using (public.eh_admin((select ministerio_id from public.modelos_roteiro where id = modelo_roteiro_itens.modelo_id)))
  with check (public.eh_admin((select ministerio_id from public.modelos_roteiro where id = modelo_roteiro_itens.modelo_id)));

drop policy if exists "acesso público temporário — escalas (sem auth ainda)" on public.escalas;
create policy "escalas_select_publico" on public.escalas for select using (true);
create policy "escalas_admin_escreve" on public.escalas for all using (public.eh_admin(ministerio_id)) with check (public.eh_admin(ministerio_id));

drop policy if exists "acesso público temporário — roteiro_itens (sem auth ainda)" on public.roteiro_itens;
create policy "roteiro_itens_select_publico" on public.roteiro_itens for select using (true);
create policy "roteiro_itens_admin_escreve" on public.roteiro_itens for all
  using (public.eh_admin_da_escala(escala_id)) with check (public.eh_admin_da_escala(escala_id));

-- ----------------------------------------------------------
-- escala_participantes: admin gerencia tudo; o próprio participante pode
-- atualizar sua linha (confirmar/recusar presença).
-- ----------------------------------------------------------
drop policy if exists "acesso público temporário — escala_participantes (sem auth ainda)" on public.escala_participantes;
create policy "participantes_select_publico" on public.escala_participantes for select using (true);
create policy "participantes_admin_escreve" on public.escala_participantes for all
  using (public.eh_admin_da_escala(escala_id)) with check (public.eh_admin_da_escala(escala_id));
create policy "participantes_confirma_propria_presenca" on public.escala_participantes for update
  using (membro_id = public.meu_membro_id((select ministerio_id from public.escalas where id = escala_participantes.escala_id)))
  with check (membro_id = public.meu_membro_id((select ministerio_id from public.escalas where id = escala_participantes.escala_id)));

-- ----------------------------------------------------------
-- indisponibilidades: admin gerencia tudo; o próprio membro gerencia as
-- suas (marcar/desmarcar indisponibilidade).
-- ----------------------------------------------------------
drop policy if exists "acesso público temporário — indisponibilidades (sem auth ainda)" on public.indisponibilidades;
create policy "indisponibilidades_select_publico" on public.indisponibilidades for select using (true);
create policy "indisponibilidades_admin_escreve" on public.indisponibilidades for all
  using (public.eh_admin(ministerio_id)) with check (public.eh_admin(ministerio_id));
create policy "indisponibilidades_membro_gerencia_a_propria" on public.indisponibilidades for all
  using (membro_id = public.meu_membro_id(ministerio_id)) with check (membro_id = public.meu_membro_id(ministerio_id));

-- ----------------------------------------------------------
-- repertorios / repertorio_musicas / repertorio_ritos: leitura pública
-- (inalterada); escrita liberada pra repertório avulso (sem escala,
-- feature "Meus Repertórios") e só admin pra repertório vinculado a uma
-- Escala do Ministério.
-- ----------------------------------------------------------
drop policy if exists "acesso público temporário — repertorios (sem auth ainda)" on public.repertorios;
create policy "repertorios_select_publico" on public.repertorios for select using (true);
create policy "repertorios_insert_livre" on public.repertorios for insert with check (true);
create policy "repertorios_altera_conforme_dono" on public.repertorios for update
  using (public.pode_editar_repertorio(id)) with check (public.pode_editar_repertorio(id));
create policy "repertorios_exclui_conforme_dono" on public.repertorios for delete
  using (public.pode_editar_repertorio(id));

drop policy if exists "acesso público temporário — repertorio_musicas (sem auth ainda)" on public.repertorio_musicas;
create policy "repertorio_musicas_select_publico" on public.repertorio_musicas for select using (true);
create policy "repertorio_musicas_escreve_conforme_dono" on public.repertorio_musicas for all
  using (public.pode_editar_repertorio(repertorio_id)) with check (public.pode_editar_repertorio(repertorio_id));

drop policy if exists "acesso público temporário — repertorio_ritos (sem auth ainda)" on public.repertorio_ritos;
create policy "repertorio_ritos_select_publico" on public.repertorio_ritos for select using (true);
create policy "repertorio_ritos_escreve_conforme_dono" on public.repertorio_ritos for all
  using (public.pode_editar_repertorio(repertorio_id)) with check (public.pode_editar_repertorio(repertorio_id));
