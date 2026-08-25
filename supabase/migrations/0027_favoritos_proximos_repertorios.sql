-- ==========================================================
-- `meus_favoritos_com_proximo_repertorio` (0021) trazia só 1
-- "próximo" repertório por ministério favoritado (limit 1),
-- então quando havia 2 escalas na mesma data mais próxima
-- (ex: Missa das 10 e Missa das 18) uma delas ficava invisível
-- e o repertório errado podia abrir direto sem escolha.
--
-- Troca `proximo` (objeto único) por `proximos` (array) com
-- todas as escalas publicadas da data mais próxima — a Início
-- deixa a pessoa escolher quando houver mais de uma.
-- ==========================================================

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
           'proximos', (
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
           )
         ) order by m.nome), '[]'::jsonb)
    from public.ministerio_favoritos f
    join public.ministerios m on m.id = f.ministerio_id
    left join public.igrejas i on i.id = m.igreja_id
   where f.auth_uid = auth.uid();
$$;
grant execute on function public.meus_favoritos_com_proximo_repertorio() to authenticated;
