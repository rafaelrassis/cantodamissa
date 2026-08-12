-- ==========================================================
-- Ministério — schema real (fase sem auth, mesmo padrão de
-- 0003_repertorios_sem_auth.sql: device_key + policy pública
-- temporária, pronta pra trocar por auth.uid() depois)
-- ==========================================================

create table if not exists public.ministerios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo_convite text not null unique,
  criado_por_device_key text not null,
  criado_em timestamptz not null default now()
);

create table if not exists public.ministerio_membros (
  id uuid primary key default gen_random_uuid(),
  ministerio_id uuid not null references public.ministerios(id) on delete cascade,
  device_key text not null,
  nome text not null,
  avatar_cor text not null default 'bg-teal-500',
  admin boolean not null default false,
  aniversario date,
  criado_em timestamptz not null default now(),
  unique (ministerio_id, device_key)
);
create index if not exists idx_membros_ministerio on public.ministerio_membros (ministerio_id);
create index if not exists idx_membros_device_key on public.ministerio_membros (device_key);

create table if not exists public.funcoes (
  id uuid primary key default gen_random_uuid(),
  ministerio_id uuid not null references public.ministerios(id) on delete cascade,
  nome text not null,
  icone text not null default '🎵'
);
create index if not exists idx_funcoes_ministerio on public.funcoes (ministerio_id);

create table if not exists public.membro_funcoes (
  membro_id uuid not null references public.ministerio_membros(id) on delete cascade,
  funcao_id uuid not null references public.funcoes(id) on delete cascade,
  primary key (membro_id, funcao_id)
);

create table if not exists public.escalas (
  id uuid primary key default gen_random_uuid(),
  ministerio_id uuid not null references public.ministerios(id) on delete cascade,
  titulo text not null,
  data date not null,
  hora text not null,
  observacoes text not null default '',
  publicada boolean not null default false,
  solicitar_confirmacao boolean not null default true,
  cor_paleta text,
  criado_em timestamptz not null default now()
);
create index if not exists idx_escalas_ministerio on public.escalas (ministerio_id);

create table if not exists public.escala_participantes (
  id uuid primary key default gen_random_uuid(),
  escala_id uuid not null references public.escalas(id) on delete cascade,
  membro_id uuid not null references public.ministerio_membros(id) on delete cascade,
  funcao_id uuid references public.funcoes(id) on delete set null,
  status text not null default 'pendente' check (status in ('pendente', 'confirmado', 'recusado')),
  unique (escala_id, membro_id, funcao_id)
);
create index if not exists idx_participantes_escala on public.escala_participantes (escala_id);

create table if not exists public.roteiro_itens (
  id uuid primary key default gen_random_uuid(),
  escala_id uuid not null references public.escalas(id) on delete cascade,
  ordem int not null default 0,
  titulo text not null,
  descricao text not null default '',
  duracao_segundos int,
  icone text
);
create index if not exists idx_roteiro_escala on public.roteiro_itens (escala_id);

create table if not exists public.indisponibilidades (
  id uuid primary key default gen_random_uuid(),
  ministerio_id uuid not null references public.ministerios(id) on delete cascade,
  membro_id uuid not null references public.ministerio_membros(id) on delete cascade,
  data date not null,
  motivo text not null default ''
);
create index if not exists idx_indisponibilidades_ministerio on public.indisponibilidades (ministerio_id);

create table if not exists public.avisos (
  id uuid primary key default gen_random_uuid(),
  ministerio_id uuid not null references public.ministerios(id) on delete cascade,
  titulo text not null,
  descricao text not null default '',
  em_destaque boolean not null default false,
  arquivado boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists idx_avisos_ministerio on public.avisos (ministerio_id);

create table if not exists public.solicitacoes_ingresso (
  id uuid primary key default gen_random_uuid(),
  ministerio_id uuid not null references public.ministerios(id) on delete cascade,
  device_key text not null,
  nome text not null,
  codigo_usado text not null,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  criado_em timestamptz not null default now()
);
create index if not exists idx_solicitacoes_ministerio on public.solicitacoes_ingresso (ministerio_id);

-- ----------------------------------------------------------
-- RLS: acesso público temporário (sem auth ainda), mesmo padrão
-- de 0003. Trocar por policies com auth.uid() quando entrar login real.
-- ----------------------------------------------------------
alter table public.ministerios enable row level security;
alter table public.ministerio_membros enable row level security;
alter table public.funcoes enable row level security;
alter table public.membro_funcoes enable row level security;
alter table public.escalas enable row level security;
alter table public.escala_participantes enable row level security;
alter table public.roteiro_itens enable row level security;
alter table public.indisponibilidades enable row level security;
alter table public.avisos enable row level security;
alter table public.solicitacoes_ingresso enable row level security;

create policy "acesso público temporário — ministerios (sem auth ainda)" on public.ministerios for all using (true) with check (true);
create policy "acesso público temporário — ministerio_membros (sem auth ainda)" on public.ministerio_membros for all using (true) with check (true);
create policy "acesso público temporário — funcoes (sem auth ainda)" on public.funcoes for all using (true) with check (true);
create policy "acesso público temporário — membro_funcoes (sem auth ainda)" on public.membro_funcoes for all using (true) with check (true);
create policy "acesso público temporário — escalas (sem auth ainda)" on public.escalas for all using (true) with check (true);
create policy "acesso público temporário — escala_participantes (sem auth ainda)" on public.escala_participantes for all using (true) with check (true);
create policy "acesso público temporário — roteiro_itens (sem auth ainda)" on public.roteiro_itens for all using (true) with check (true);
create policy "acesso público temporário — indisponibilidades (sem auth ainda)" on public.indisponibilidades for all using (true) with check (true);
create policy "acesso público temporário — avisos (sem auth ainda)" on public.avisos for all using (true) with check (true);
create policy "acesso público temporário — solicitacoes_ingresso (sem auth ainda)" on public.solicitacoes_ingresso for all using (true) with check (true);
