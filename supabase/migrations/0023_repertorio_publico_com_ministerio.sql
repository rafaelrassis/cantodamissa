-- ==========================================================
-- Complementa 0021: repertório público agora traz o ministério
-- (id + nome) junto, pra dar pra favoritar direto na tela do
-- repertório da assembleia, sem precisar voltar pra busca.
-- ==========================================================

create or replace function public.repertorio_publico_por_id(p_repertorio_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(r) || jsonb_build_object(
    'ministerio_id', m.id,
    'ministerio_nome', m.nome,
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
    and e.data >= current_date;
$$;
grant execute on function public.repertorio_publico_por_id(uuid) to anon, authenticated;
