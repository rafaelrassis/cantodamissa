-- ==========================================================
-- Liturgia Cifras — schema inicial
-- ==========================================================

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

-- unaccent() é marcada STABLE (não IMMUTABLE) pelo Postgres, porque em teoria
-- depende do dicionário de busca configurado. Colunas geradas (GENERATED
-- ALWAYS AS ... STORED) exigem expressão IMMUTABLE, então criamos um
-- wrapper que promete o compilador que o resultado é determinístico —
-- seguro aqui porque não trocamos o dicionário de unaccent em runtime.
create or replace function immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
as $$
  select unaccent('unaccent', $1)
$$;

-- ---------- ENUMS ----------

create type tempo_liturgico as enum (
  'Advento', 'Natal', 'Quaresma', 'Pascoa', 'TempoComum'
);

create type ciclo_dominical as enum ('A', 'B', 'C');

create type momento_missa as enum (
  'Entrada',
  'AtoPenitencial',
  'Gloria',
  'SalmoResponsorial',
  'AclamacaoEvangelho',
  'Ofertorio',
  'Santo',
  'Cordeiro',
  'Comunhao',
  'PosComunhao',
  'Envio'
);

-- ---------- USUÁRIOS (estende auth.users do Supabase) ----------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_pro boolean not null default false,
  pro_expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- MÚSICAS ----------

create table public.musicas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  artist text,
  original_tone text not null,        -- tom canônico, ex: 'G'
  difficulty smallint,                 -- 1 fácil - 5 difícil
  capo smallint default 0,
  youtube_url text,
  lyrics text,                         -- letra pura, sem acordes (busca full-text)
  chords_content text not null,        -- formato ChordPro: "[G]Como são belos os [Em]pés..."
  views_count integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- coluna gerada para busca full-text ignorando acento
  search_vector tsvector generated always as (
    to_tsvector('portuguese', immutable_unaccent(coalesce(title,'') || ' ' || coalesce(artist,'') || ' ' || coalesce(lyrics,'')))
  ) stored
);

create index idx_musicas_search on public.musicas using gin(search_vector);
create index idx_musicas_views on public.musicas (views_count desc);

-- acordes usados: derivado do chords_content, mas cacheado pra performance de exibição
create table public.musica_acordes (
  musica_id uuid references public.musicas(id) on delete cascade,
  acorde text not null,
  ordem smallint not null,
  primary key (musica_id, acorde)
);

-- ---------- RELAÇÃO N:N litúrgica ----------

create table public.musica_tempo_liturgico (
  musica_id uuid references public.musicas(id) on delete cascade,
  tempo tempo_liturgico not null,
  primary key (musica_id, tempo)
);

create table public.musica_ciclo (
  musica_id uuid references public.musicas(id) on delete cascade,
  ciclo ciclo_dominical not null,
  primary key (musica_id, ciclo)
);

create table public.musica_momento (
  musica_id uuid references public.musicas(id) on delete cascade,
  momento momento_missa not null,
  primary key (musica_id, momento)
);

-- ---------- CALENDÁRIO LITÚRGICO ----------

create table public.domingos (
  id uuid primary key default gen_random_uuid(),
  data date not null unique,
  nome text not null,                  -- ex: '3º Domingo do Advento'
  tempo tempo_liturgico not null,
  ciclo ciclo_dominical not null,
  cor_liturgica text
);

-- ---------- REPERTÓRIOS (Módulo Banda/Ministério) ----------

create table public.repertorios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,                  -- ex: 'Missa das 19h - 10/08'
  data_missa date,
  owner_id uuid references public.profiles(id) on delete cascade,
  share_token text unique default encode(gen_random_bytes(8), 'hex'),
  created_at timestamptz not null default now()
);

create table public.repertorio_musicas (
  repertorio_id uuid references public.repertorios(id) on delete cascade,
  musica_id uuid references public.musicas(id) on delete cascade,
  momento momento_missa,
  tom_escolhido text,                  -- tom transposto pra essa missa específica
  ordem smallint not null,
  primary key (repertorio_id, musica_id)
);

create table public.repertorio_membros (
  repertorio_id uuid references public.repertorios(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  primary key (repertorio_id, profile_id)
);

-- ---------- RLS básico ----------

alter table public.profiles enable row level security;
alter table public.musicas enable row level security;
alter table public.repertorios enable row level security;
alter table public.repertorio_musicas enable row level security;
alter table public.repertorio_membros enable row level security;

create policy "musicas são públicas para leitura" on public.musicas
  for select using (true);

create policy "usuário lê o próprio perfil" on public.profiles
  for select using (auth.uid() = id);

create policy "dono gerencia seus repertórios" on public.repertorios
  for all using (auth.uid() = owner_id);

create policy "membros leem repertório" on public.repertorio_musicas
  for select using (
    exists (
      select 1 from public.repertorio_membros rm
      where rm.repertorio_id = repertorio_musicas.repertorio_id
      and rm.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.repertorios r
      where r.id = repertorio_musicas.repertorio_id
      and r.owner_id = auth.uid()
    )
  );
