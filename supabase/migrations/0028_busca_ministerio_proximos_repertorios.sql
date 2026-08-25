-- ==========================================================
-- `buscar_ministerios_publicos` (0026) trazia só 1 "próximo"
-- repertório por ministério (limit 1), com o mesmo problema de
-- `meus_favoritos_com_proximo_repertorio` (ver 0027): quando
-- havia 2 escalas na mesma data mais próxima (ex: Missa das 10
-- e Missa das 18) uma delas ficava invisível na busca.
--
-- Troca a coluna `proximo` (objeto único) por `proximos` (array)
-- com todas as escalas publicadas da data mais próxima — mesmo
-- formato que a Início usa nos favoritos (0027).
-- ==========================================================

drop function if exists public.buscar_ministerios_publicos(text, text, text, text, int, int);

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
  proximos jsonb,
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
      select coalesce(jsonb_agg(jsonb_build_object(
               'repertorio_id', r.id,
               'nome', r.nome,
               'data', e.data,
               'hora', e.hora
             ) order by e.hora), '[]'::jsonb)
        from public.escalas e
        join public.repertorios r on r.escala_id = e.id
       where e.ministerio_id = m.id
         and e.publicada = true
         and e.data = (
           select min(e2.data)
             from public.escalas e2
            where e2.ministerio_id = m.id
              and e2.publicada = true
              and e2.data >= current_date
         )
    ) as proximos,
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
