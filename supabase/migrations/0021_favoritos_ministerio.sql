-- ==========================================================
-- Favoritos de ministério: qualquer usuário logado (Google
-- Auth) pode buscar um ministério por código de convite ou
-- por igreja+UF+cidade e "favoritar" sem pedir ingresso —
-- só pra acompanhar o repertório da próxima escala na Início.
--
-- Reaproveita `codigo_convite` (0009) como identificador de
-- busca: favoritar não concede acesso a nada que a busca já
-- não devolve (nome do ministério + igreja vinculada), então
-- não há problema em aceitar o mesmo código usado pra pedir
-- ingresso — o que muda é que favoritar não passa por
-- aprovação do admin (ver solicitar_ingresso em 0013).
-- ==========================================================

create table if not exists public.ministerio_favoritos (
  id uuid primary key default gen_random_uuid(),
  auth_uid uuid not null default auth.uid(),
  ministerio_id uuid not null references public.ministerios(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (auth_uid, ministerio_id)
);
create index if not exists idx_favoritos_auth_uid on public.ministerio_favoritos (auth_uid);
create index if not exists idx_favoritos_ministerio on public.ministerio_favoritos (ministerio_id);

alter table public.ministerio_favoritos enable row level security;

create policy "usuário gerencia os próprios favoritos"
  on public.ministerio_favoritos for all
  using (auth_uid = auth.uid())
  with check (auth_uid = auth.uid());

-- ----------------------------------------------------------
-- Busca pública de ministérios: por código exato OU por
-- nome da igreja + UF + cidade (todos opcionais, mas pelo
-- menos um precisa vir preenchido).
-- ----------------------------------------------------------
create or replace function public.buscar_ministerios_publicos(
  p_codigo text default null,
  p_igreja text default null,
  p_estado text default null,
  p_cidade text default null
)
returns table (
  ministerio_id uuid,
  ministerio_nome text,
  codigo_convite text,
  igreja_nome text,
  igreja_cidade text,
  igreja_estado text
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.nome, m.codigo_convite, i.nome, i.cidade, i.estado
    from public.ministerios m
    left join public.igrejas i on i.id = m.igreja_id
   where
     -- Busca por código: exata, ignora os demais filtros
     (p_codigo is not null and length(trim(p_codigo)) > 0 and upper(m.codigo_convite) = upper(trim(p_codigo)))
     or (
       -- Busca por igreja/UF/cidade: filtros combinados em AND, mas
       -- exige pelo menos um preenchido pra não devolver tudo
       (p_codigo is null or length(trim(p_codigo)) = 0)
       and (
         (p_igreja is not null and length(trim(p_igreja)) >= 2)
         or (p_estado is not null and length(trim(p_estado)) = 2)
         or (p_cidade is not null and length(trim(p_cidade)) >= 2)
       )
       and (p_igreja is null or length(trim(p_igreja)) < 2 or i.nome ilike '%' || p_igreja || '%')
       and (p_estado is null or length(trim(p_estado)) < 2 or i.estado = upper(trim(p_estado)))
       and (p_cidade is null or length(trim(p_cidade)) < 2 or i.cidade ilike p_cidade)
     )
   order by m.nome
   limit 20;
$$;
grant execute on function public.buscar_ministerios_publicos(text, text, text, text) to anon, authenticated;

-- ----------------------------------------------------------
-- Favoritos do usuário logado + repertório da próxima escala
-- publicada de cada um (ou null se não houver nenhuma aberta).
-- Um único round-trip pra Início.
-- ----------------------------------------------------------
create or replace function public.meus_favoritos_com_proximo_repertorio()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'ministerio_id', m.id,
           'ministerio_nome', m.nome,
           'igreja_nome', i.nome,
           'proximo', (
             select jsonb_build_object(
                      'repertorio_id', r.id,
                      'nome', r.nome,
                      'data', e.data,
                      'hora', e.hora
                    )
               from public.escalas e
               join public.repertorios r on r.escala_id = e.id
              where e.ministerio_id = m.id
                and e.publicada = true
                and e.data >= current_date
              order by e.data, e.hora
              limit 1
           )
         ) order by m.nome), '[]'::jsonb)
    from public.ministerio_favoritos f
    join public.ministerios m on m.id = f.ministerio_id
    left join public.igrejas i on i.id = m.igreja_id
   where f.auth_uid = auth.uid();
$$;
grant execute on function public.meus_favoritos_com_proximo_repertorio() to authenticated;

-- ----------------------------------------------------------
-- `repertorio_publico_por_id` (0019) exigia igreja vinculada
-- só por causa do fluxo de QR code da igreja — favoritos não
-- têm essa premissa (o ministério pode não ter igreja
-- cadastrada). A checagem de segurança real (publicada + data
-- futura) continua igual, só cai a exigência de igreja_id.
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
  where r.id = p_repertorio_id
    and e.publicada = true
    and e.data >= current_date;
$$;
grant execute on function public.repertorio_publico_por_id(uuid) to anon, authenticated;
