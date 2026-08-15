-- ==========================================================
-- Escrita do catálogo restrita a admin de verdade
-- ==========================================================
-- Substitui as policies "acesso público temporário" de 0005/0007, que
-- liberavam insert/update/delete de `musicas` e `cantores` pro role
-- `anon`. Como a anon key vai no bundle do front, aquilo significava que
-- qualquer visitante podia reescrever ou apagar o acervo inteiro com uma
-- chamada direta ao PostgREST — a checagem de admin do app
-- (useAdminAuth.ts + VITE_ADMIN_EMAILS) nunca passou de enfeite de UI.
--
-- O login Google já é real (ver src/lib/useAuth.ts), então dá pra decidir
-- "é admin?" a partir do e-mail assinado dentro do JWT em vez de confiar
-- em variável de ambiente do cliente.
--
-- IMPORTANTE — passo manual depois de aplicar esta migration: popular a
-- tabela `admins` com os e-mails que hoje estão em VITE_ADMIN_EMAILS,
-- senão ninguém consegue mais cadastrar música:
--
--   insert into public.admins (email) values ('voce@gmail.com');
--
-- (rodar pelo SQL Editor do dashboard, que usa a service role e ignora RLS)

create table if not exists public.admins (
  email text primary key,
  criado_em timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Cada um só enxerga a própria linha: dá pro app perguntar "sou admin?"
-- sem expor a lista de administradores pra quem quiser lê-la.
create policy "admins_le_a_propria_linha" on public.admins
  for select using (lower(email) = lower(nullif(auth.jwt() ->> 'email', '')));

-- Alteração da lista é só pela service role (dashboard/SQL editor): sem
-- policy de insert/update/delete, o PostgREST barra todo mundo.

create or replace function public.eh_admin_global()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(nullif(auth.jwt() ->> 'email', ''))
  );
$$;

-- ----------------------------------------------------------
-- musicas: leitura pública (é um app de cifras), escrita só admin
-- ----------------------------------------------------------
drop policy if exists "acesso público temporário — musicas (sem auth ainda)" on public.musicas;
drop policy if exists "acesso público temporário — musicas update (sem auth ainda)" on public.musicas;
drop policy if exists "acesso público temporário — musicas delete (sem auth ainda)" on public.musicas;

create policy "musicas_admin_insere" on public.musicas
  for insert with check (public.eh_admin_global());
create policy "musicas_admin_altera" on public.musicas
  for update using (public.eh_admin_global()) with check (public.eh_admin_global());
create policy "musicas_admin_exclui" on public.musicas
  for delete using (public.eh_admin_global());

-- ----------------------------------------------------------
-- cantores: idem
-- ----------------------------------------------------------
drop policy if exists "acesso público temporário — cantores (sem auth ainda)" on public.cantores;
drop policy if exists "acesso público temporário — cantores update (sem auth ainda)" on public.cantores;
drop policy if exists "acesso público temporário — cantores delete (sem auth ainda)" on public.cantores;

create policy "cantores_admin_insere" on public.cantores
  for insert with check (public.eh_admin_global());
create policy "cantores_admin_altera" on public.cantores
  for update using (public.eh_admin_global()) with check (public.eh_admin_global());
create policy "cantores_admin_exclui" on public.cantores
  for delete using (public.eh_admin_global());

-- ----------------------------------------------------------
-- Tabelas que nunca tiveram RLS ligada (0001_init.sql só habilitou em 5
-- das 10 tabelas criadas lá). Sem `enable row level security`, o grant
-- padrão do Supabase pro role anon já dá CRUD completo — ou seja,
-- estavam abertas pra escrita mesmo com o app inteiro correto.
-- ----------------------------------------------------------
alter table public.musica_acordes enable row level security;
alter table public.musica_tempo_liturgico enable row level security;
alter table public.musica_ciclo enable row level security;
alter table public.musica_momento enable row level security;
alter table public.domingos enable row level security;

create policy "musica_acordes_select_publico" on public.musica_acordes for select using (true);
create policy "musica_acordes_admin_escreve" on public.musica_acordes for all
  using (public.eh_admin_global()) with check (public.eh_admin_global());

create policy "musica_tempo_select_publico" on public.musica_tempo_liturgico for select using (true);
create policy "musica_tempo_admin_escreve" on public.musica_tempo_liturgico for all
  using (public.eh_admin_global()) with check (public.eh_admin_global());

create policy "musica_ciclo_select_publico" on public.musica_ciclo for select using (true);
create policy "musica_ciclo_admin_escreve" on public.musica_ciclo for all
  using (public.eh_admin_global()) with check (public.eh_admin_global());

create policy "musica_momento_select_publico" on public.musica_momento for select using (true);
create policy "musica_momento_admin_escreve" on public.musica_momento for all
  using (public.eh_admin_global()) with check (public.eh_admin_global());

create policy "domingos_select_publico" on public.domingos for select using (true);
create policy "domingos_admin_escreve" on public.domingos for all
  using (public.eh_admin_global()) with check (public.eh_admin_global());

-- `profiles` já tinha RLS com select do próprio perfil; faltava permitir
-- que a pessoa criasse/editasse a própria linha.
create policy "profiles_insere_o_proprio" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_altera_o_proprio" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ----------------------------------------------------------
-- Contador de acessos
-- ----------------------------------------------------------
-- views_count é a base do "Top 50", das "Músicas em alta" e dos
-- "Artistas mais ouvidos", mas nada no app jamais incrementava a coluna —
-- os rankings ordenavam por um número congelado no seed. Agora que
-- `musicas` só aceita escrita de admin, o incremento precisa de uma
-- função security definer: ela sobe só esse contador, sem abrir o resto
-- da linha. Não há proteção contra chamar em loop pra inflar o número —
-- pra essa fase do produto o custo/benefício de rate limit não compensa.
create or replace function public.registrar_visualizacao(p_musica_id uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.musicas set views_count = views_count + 1 where id = p_musica_id;
$$;

grant execute on function public.registrar_visualizacao(uuid) to anon, authenticated;

-- ----------------------------------------------------------
-- Submissões da comunidade (sugestão de música nova / correção de cifra)
-- ----------------------------------------------------------
-- Antes isso vivia só em localStorage (src/lib/submissoes.ts), o que
-- significava que a tela de moderação do admin só enxergava o que tinha
-- sido enviado no próprio navegador dele: nenhuma sugestão de usuário
-- real chegava a ser moderada.
create table if not exists public.submissoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('nova', 'correcao')),
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'rejeitada')),
  autor_nome text not null default '',
  autor_auth_uid uuid,
  musica_original_id uuid references public.musicas(id) on delete set null,
  title text not null,
  artist text not null default '',
  original_tone text not null default '',
  chords_content text not null default '',
  observacao text not null default '',
  criado_em timestamptz not null default now()
);
create index if not exists idx_submissoes_status on public.submissoes (status, criado_em desc);

alter table public.submissoes enable row level security;

-- Quem enviou vê a própria sugestão (pra saber se foi aprovada); admin vê
-- todas. Autoria de sugestão aprovada aparece nos créditos da cifra, então
-- o autor_nome de aprovadas também é público.
create policy "submissoes_select" on public.submissoes
  for select using (
    public.eh_admin_global()
    or (autor_auth_uid is not null and autor_auth_uid = auth.uid())
    or status = 'aprovada'
  );
create policy "submissoes_insert_autenticado" on public.submissoes
  for insert with check (auth.uid() is not null and autor_auth_uid = auth.uid());
create policy "submissoes_admin_modera" on public.submissoes
  for update using (public.eh_admin_global()) with check (public.eh_admin_global());
create policy "submissoes_admin_exclui" on public.submissoes
  for delete using (public.eh_admin_global());
