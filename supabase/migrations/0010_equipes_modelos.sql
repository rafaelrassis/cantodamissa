-- ==========================================================
-- Equipes (grupos de membros pra escalar de uma vez) e Modelos de
-- roteiro (roteiro reutilizável). Mesmo padrão de RLS pública
-- temporária das demais tabelas do ministério (ver 0009).
-- ==========================================================

create table if not exists public.equipes (
  id uuid primary key default gen_random_uuid(),
  ministerio_id uuid not null references public.ministerios(id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now()
);
create index if not exists idx_equipes_ministerio on public.equipes (ministerio_id);

create table if not exists public.equipe_membros (
  equipe_id uuid not null references public.equipes(id) on delete cascade,
  membro_id uuid not null references public.ministerio_membros(id) on delete cascade,
  primary key (equipe_id, membro_id)
);

create table if not exists public.modelos_roteiro (
  id uuid primary key default gen_random_uuid(),
  ministerio_id uuid not null references public.ministerios(id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now()
);
create index if not exists idx_modelos_roteiro_ministerio on public.modelos_roteiro (ministerio_id);

create table if not exists public.modelo_roteiro_itens (
  id uuid primary key default gen_random_uuid(),
  modelo_id uuid not null references public.modelos_roteiro(id) on delete cascade,
  ordem int not null default 0,
  titulo text not null,
  descricao text not null default '',
  duracao_segundos int,
  icone text
);
create index if not exists idx_modelo_roteiro_itens_modelo on public.modelo_roteiro_itens (modelo_id);

alter table public.equipes enable row level security;
alter table public.equipe_membros enable row level security;
alter table public.modelos_roteiro enable row level security;
alter table public.modelo_roteiro_itens enable row level security;

create policy "acesso público temporário — equipes (sem auth ainda)" on public.equipes for all using (true) with check (true);
create policy "acesso público temporário — equipe_membros (sem auth ainda)" on public.equipe_membros for all using (true) with check (true);
create policy "acesso público temporário — modelos_roteiro (sem auth ainda)" on public.modelos_roteiro for all using (true) with check (true);
create policy "acesso público temporário — modelo_roteiro_itens (sem auth ainda)" on public.modelo_roteiro_itens for all using (true) with check (true);
