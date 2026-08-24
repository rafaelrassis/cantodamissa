-- ==========================================================
-- Igrejas: vínculo público para a assembleia acessar o
-- repertório da missa (letra) sem login, buscando por nome
-- ou código da igreja.
--
-- Padrão de acesso público segue o já estabelecido em
-- `repertorio_por_token` (migration 0014): tabelas sensíveis
-- (`escalas`, `repertorios`) continuam com RLS travado por
-- membro; o acesso anônimo passa só por RPCs `security definer`
-- que devolvem um jsonb curado, nunca a linha crua.
-- ==========================================================

create table if not exists public.igrejas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text not null unique,          -- escolhido pelo admin, ex: 'SAOJOSE'
  cidade text not null,
  estado text not null,                 -- sigla UF, ex: 'SP' — lista fechada em src/lib/ibge.ts
  criado_em timestamptz not null default now(),
  constraint codigo_formato check (codigo ~ '^[A-Z0-9]{3,20}$'),
  constraint estado_formato check (estado ~ '^[A-Z]{2}$')
);
create unique index if not exists idx_igrejas_codigo on public.igrejas (upper(codigo));

alter table public.ministerios
  add column if not exists igreja_id uuid references public.igrejas(id) on delete set null;
create index if not exists idx_ministerios_igreja on public.ministerios (igreja_id);

alter table public.igrejas enable row level security;

create policy "igrejas são públicas para leitura" on public.igrejas
  for select using (true);

create policy "admin do ministério gerencia igreja"
  on public.igrejas for all
  using (
    exists (
      select 1 from public.ministerios m
      join public.ministerio_membros mm on mm.ministerio_id = m.id
      where m.igreja_id = igrejas.id
        and mm.auth_uid = auth.uid()
        and mm.admin = true
    )
  );

-- ----------------------------------------------------------
-- Busca pública: nome ou código da igreja (autocomplete)
-- ----------------------------------------------------------
create or replace function public.buscar_igrejas(p_termo text)
returns setof public.igrejas
language sql
stable
security definer
set search_path = public
as $$
  select *
    from public.igrejas
   where p_termo is not null and length(trim(p_termo)) >= 2
     and (nome ilike '%' || p_termo || '%' or codigo ilike '%' || p_termo || '%')
   order by nome
   limit 20;
$$;
grant execute on function public.buscar_igrejas(text) to anon, authenticated;

-- ----------------------------------------------------------
-- Lista repertórios abertos (escala publicada, data >= hoje)
-- de uma igreja, por código exato.
-- ----------------------------------------------------------
create or replace function public.repertorios_abertos_por_igreja(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'repertorio_id', r.id,
           'nome', r.nome,
           'data', e.data,
           'hora', e.hora,
           'ministerio_nome', m.nome
         ) order by e.data, e.hora), '[]'::jsonb)
    from public.igrejas i
    join public.ministerios m on m.igreja_id = i.id
    join public.escalas e on e.ministerio_id = m.id
    join public.repertorios r on r.escala_id = e.id
   where upper(i.codigo) = upper(p_codigo)
     and e.publicada = true
     and e.data >= current_date;
$$;
grant execute on function public.repertorios_abertos_por_igreja(text) to anon, authenticated;

-- ----------------------------------------------------------
-- Abre um repertório público específico — mesma checagem de
-- (publicada + data >= hoje + vinculado a igreja), mesmo shape
-- de retorno de `repertorio_por_token`.
-- ----------------------------------------------------------
create or replace function public.repertorio_publico_por_id(p_repertorio_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(r) || jsonb_build_object(
    'repertorio_ritos', coalesce((
      select jsonb_agg(jsonb_build_object('nome', rr.nome, 'ordem', rr.ordem) order by rr.ordem)
        from public.repertorio_ritos rr where rr.repertorio_id = r.id), '[]'::jsonb),
    'repertorio_musicas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'musica_id', rm.musica_id,
               'momento', rm.momento,
               'tom_escolhido', rm.tom_escolhido,
               'ordem', rm.ordem,
               'musicas', (select jsonb_build_object('title', mu.title, 'artist', mu.artist, 'original_tone', mu.original_tone)
                             from public.musicas mu where mu.id = rm.musica_id)
             ) order by rm.ordem)
        from public.repertorio_musicas rm where rm.repertorio_id = r.id), '[]'::jsonb)
  )
  from public.repertorios r
  join public.escalas e on e.id = r.escala_id
  join public.ministerios m on m.id = e.ministerio_id
  where r.id = p_repertorio_id
    and e.publicada = true
    and e.data >= current_date
    and m.igreja_id is not null;
$$;
grant execute on function public.repertorio_publico_por_id(uuid) to anon, authenticated;
