-- ==========================================================
-- Adiciona busca por código da igreja vinculada como terceiro
-- modo, junto de nome (0025) e UF/cidade. Mutuamente exclusivos:
-- código > nome > UF/cidade, por ordem de prioridade se mais de
-- um vier preenchido. Continua paginada.
--
-- É o código de `igrejas.codigo` (0019, escolhido pelo admin,
-- ex: 'SAOJOSE') — não o codigo_convite do ministério (0009),
-- que é só pra pedir ingresso como membro. Ministério sem igreja
-- vinculada não aparece nessa busca.
--
-- Nome passa a casar tanto com o nome do ministério quanto com o
-- da igreja vinculada: quem busca em geral conhece o nome da
-- igreja ("Cristo Ressuscitado"), não necessariamente o nome
-- interno do ministério ("Coral Jovem", "Teste" etc.).
-- ==========================================================

drop function if exists public.buscar_ministerios_publicos(text, text, text, int, int);

create or replace function public.buscar_ministerios_publicos(
  p_codigo text default null,
  p_nome text default null,
  p_estado text default null,
  p_cidade text default null,
  p_offset int default 0,
  p_limit int default 20
)
returns table (
  ministerio_id uuid,
  ministerio_nome text,
  codigo_convite text,
  igreja_nome text,
  igreja_cidade text,
  igreja_estado text,
  proximo jsonb,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id, m.nome, m.codigo_convite, i.nome, i.cidade, i.estado,
    (
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
    ) as proximo,
    count(*) over () as total_count
    from public.ministerios m
    left join public.igrejas i on i.id = m.igreja_id
   where
     case
       when p_codigo is not null and length(trim(p_codigo)) > 0 then
         upper(i.codigo) = upper(trim(p_codigo))
       when p_nome is not null and length(trim(p_nome)) >= 2 then
         m.nome ilike '%' || trim(p_nome) || '%' or i.nome ilike '%' || trim(p_nome) || '%'
       else
         p_estado is not null and length(trim(p_estado)) = 2
         and i.estado = upper(trim(p_estado))
         and (p_cidade is null or length(trim(p_cidade)) = 0 or i.cidade ilike p_cidade)
     end
   order by m.nome
   limit greatest(p_limit, 1)
   offset greatest(p_offset, 0);
$$;
grant execute on function public.buscar_ministerios_publicos(text, text, text, text, int, int) to anon, authenticated;
