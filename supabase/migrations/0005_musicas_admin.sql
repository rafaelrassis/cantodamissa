-- ==========================================================
-- CRUD de músicas pelo admin (fase temporária, sem auth real)
-- ==========================================================
-- Mesma lógica do 0003_repertorios_sem_auth.sql: o painel /admin usa
-- fake-auth local (useAdminAuth.ts), então a proteção de escrita hoje é
-- só de UI, não de banco. Liberamos insert/update/delete em `musicas`
-- pra anon do mesmo jeito. Quando entrar OAuth real (Fase 2), trocar
-- por policy baseada em auth.uid() + tabela de admins.

alter table public.musicas
  add column if not exists source_url text,       -- link do Cifra Club, se importado de lá
  add column if not exists source_file_url text;   -- URL no Vercel Blob, se veio de upload de arquivo

drop policy if exists "musicas são públicas para leitura" on public.musicas;

create policy "leitura pública — musicas" on public.musicas
  for select using (true);

create policy "acesso público temporário — musicas (sem auth ainda)"
  on public.musicas for insert
  with check (true);

create policy "acesso público temporário — musicas update (sem auth ainda)"
  on public.musicas for update
  using (true) with check (true);

create policy "acesso público temporário — musicas delete (sem auth ainda)"
  on public.musicas for delete
  using (true);

-- ---------------------------------------------------------
-- Pra reativar quando tivermos auth de verdade:
--
-- drop policy "acesso público temporário — musicas (sem auth ainda)" on public.musicas;
-- drop policy "acesso público temporário — musicas update (sem auth ainda)" on public.musicas;
-- drop policy "acesso público temporário — musicas delete (sem auth ainda)" on public.musicas;
-- create policy "só admin escreve" on public.musicas
--   for all using (exists (select 1 from public.admins a where a.profile_id = auth.uid()));
-- ---------------------------------------------------------
