-- ==========================================================
-- Repertórios sem autenticação (fase temporária)
-- ==========================================================
-- Ainda não temos login (Google OAuth fica pra depois — ver SPEC.md).
-- Pra repertório persistir e ser compartilhável sem auth real, usamos uma
-- `device_key` gerada no cliente (UUID salvo em localStorage) como um
-- "dono" pseudônimo — não é segurança de verdade, só serve pra cada
-- aparelho ver os repertórios que ele mesmo criou. Compartilhamento via
-- link usa o `share_token` (já existia no schema original) e ignora
-- device_key propositalmente, porque quem tem o link deve conseguir ver.
--
-- Quando implementarmos auth de verdade, isso deve ser substituído por
-- owner_id + RLS de verdade (a policy antiga baseada em auth.uid() já
-- está comentada abaixo, pronta pra reativar).

alter table public.repertorios add column if not exists device_key text;
create index if not exists idx_repertorios_device_key on public.repertorios (device_key);

-- reabre repertorios pra criação/leitura/edição sem exigir auth.uid()
drop policy if exists "dono gerencia seus repertórios" on public.repertorios;
create policy "acesso público temporário — repertorios (sem auth ainda)"
  on public.repertorios for all
  using (true)
  with check (true);

-- idem pros itens do repertório
drop policy if exists "membros leem repertório" on public.repertorio_musicas;
create policy "acesso público temporário — repertorio_musicas (sem auth ainda)"
  on public.repertorio_musicas for all
  using (true)
  with check (true);

-- ---------------------------------------------------------
-- Pra reativar quando tivermos auth de verdade:
--
-- drop policy "acesso público temporário — repertorios (sem auth ainda)" on public.repertorios;
-- create policy "dono gerencia seus repertórios" on public.repertorios
--   for all using (auth.uid() = owner_id);
--
-- drop policy "acesso público temporário — repertorio_musicas (sem auth ainda)" on public.repertorio_musicas;
-- create policy "membros leem repertório" on public.repertorio_musicas
--   for select using (
--     exists (select 1 from public.repertorio_membros rm where rm.repertorio_id = repertorio_musicas.repertorio_id and rm.profile_id = auth.uid())
--     or exists (select 1 from public.repertorios r where r.id = repertorio_musicas.repertorio_id and r.owner_id = auth.uid())
--   );
-- ---------------------------------------------------------
