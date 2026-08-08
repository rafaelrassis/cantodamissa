-- ==========================================================
-- CRUD de cantores pelo admin (fase temporária, sem auth real)
-- ==========================================================
-- Mesma lógica do 0005_musicas_admin.sql: o painel /admin usa fake-auth
-- local (useAdminAuth.ts), então a proteção de escrita hoje é só de UI,
-- não de banco. Liberamos insert/update/delete em `cantores` pra anon do
-- mesmo jeito. Quando entrar OAuth real (Fase 2), trocar por policy
-- baseada em auth.uid() + tabela de admins.

create policy "acesso público temporário — cantores (sem auth ainda)"
  on public.cantores for insert
  with check (true);

create policy "acesso público temporário — cantores update (sem auth ainda)"
  on public.cantores for update
  using (true) with check (true);

create policy "acesso público temporário — cantores delete (sem auth ainda)"
  on public.cantores for delete
  using (true);
