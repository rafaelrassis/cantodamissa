-- ==========================================================
-- Complementa 0021: a busca pública de ministério agora traz
-- o repertório da próxima escala publicada junto, pra dar pra
-- abrir sem precisar favoritar nem logar (ver BuscarMinisterioTela).
-- ==========================================================

-- `create or replace function` não aceita mudar as colunas de retorno de
-- uma função table-returning (Postgres: "cannot change return type of
-- existing function" quando os OUT params mudam) — precisa dropar a versão
-- de 0021 antes de recriar com a coluna `proximo` a mais.
drop function if exists public.buscar_ministerios_publicos(text, text, text, text);

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
  igreja_estado text,
  proximo jsonb
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
    ) as proximo
    from public.ministerios m
    left join public.igrejas i on i.id = m.igreja_id
   where
     (p_codigo is not null and length(trim(p_codigo)) > 0 and upper(m.codigo_convite) = upper(trim(p_codigo)))
     or (
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
