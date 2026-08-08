-- ==========================================================
-- Cantores: página do cantor (nome, foto, cifras)
-- ==========================================================

create table public.cantores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text unique not null,
  foto_url text,
  created_at timestamptz not null default now()
);

alter table public.musicas add column cantor_id uuid references public.cantores(id);

create index idx_musicas_cantor on public.musicas (cantor_id);
create index idx_musicas_cantor_views on public.musicas (cantor_id, views_count desc);
create index idx_musicas_cantor_title on public.musicas (cantor_id, title);

alter table public.cantores enable row level security;

create policy "cantores são públicos para leitura" on public.cantores
  for select using (true);

-- NOTA: coluna "artist" (texto) em musicas fica como está, por compatibilidade.
-- Backfill de cantores a partir de "artist" distinct NÃO está incluso aqui —
-- fazer manualmente ou pedir script separado antes de rodar em produção.
