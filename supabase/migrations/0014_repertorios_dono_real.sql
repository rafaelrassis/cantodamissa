-- ==========================================================
-- Repertórios: dono de verdade (auth_uid) e vínculo real com escalas
-- ==========================================================
-- Até aqui um repertório era "de quem tem a device_key" — um texto que o
-- próprio cliente manda na query, ou seja, nenhum controle: com select
-- público, qualquer um listava (e editava) os repertórios de todo mundo.
-- Agora o dono é o auth.uid() da sessão (anônima ou Google), que vem
-- assinado no JWT. device_key continua na tabela só pro backfill das
-- linhas antigas (ver reivindicar_repertorios_do_device abaixo).
--
-- escala_id também vira uuid com FK de verdade: quando a coluna nasceu
-- (0008) o módulo Ministério ainda era mock em memória e guardava ids do
-- tipo "e1699999999999". Valores que não são uuid viram null aqui — são
-- vínculos pra escalas que nunca existiram no banco.

alter table public.repertorios add column if not exists auth_uid uuid;
create index if not exists idx_repertorios_auth_uid on public.repertorios (auth_uid);

-- Condicional pra que reaplicar a migration não quebre: numa coluna que
-- já é uuid, o `using` com operador de regex nem faria sentido.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'repertorios'
       and column_name = 'escala_id' and data_type <> 'uuid'
  ) then
    alter table public.repertorios
      alter column escala_id type uuid
      using (case when escala_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                  then escala_id::uuid end);
  end if;
end
$$;

-- Descarta vínculos apontando pra escalas inexistentes antes de criar a FK
-- (o módulo mock podia deixar órfãos).
update public.repertorios r
   set escala_id = null
 where escala_id is not null
   and not exists (select 1 from public.escalas e where e.id = r.escala_id);

alter table public.repertorios
  drop constraint if exists repertorios_escala_id_fkey;
alter table public.repertorios
  add constraint repertorios_escala_id_fkey
  foreign key (escala_id) references public.escalas(id) on delete set null;

-- 1 escala = 1 repertório (o app já assume isso em obterRepertorioPorEscala)
create unique index if not exists idx_repertorios_escala_unica
  on public.repertorios (escala_id) where escala_id is not null;

-- ----------------------------------------------------------
-- Quem pode ver / editar
-- ----------------------------------------------------------
create or replace function public.pode_ver_repertorio(p_repertorio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (r.auth_uid is not null and r.auth_uid = auth.uid())
            or (r.escala_id is not null
                and public.eh_membro((select e.ministerio_id from public.escalas e where e.id = r.escala_id)))
       from public.repertorios r where r.id = p_repertorio_id),
    false);
$$;

create or replace function public.pode_editar_repertorio(p_repertorio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select case
              -- repertório de uma Escala é documento do ministério: quem
              -- edita é admin, não quem por acaso criou a linha
              when r.escala_id is not null
                then public.eh_admin((select e.ministerio_id from public.escalas e where e.id = r.escala_id))
              else r.auth_uid is not null and r.auth_uid = auth.uid()
            end
       from public.repertorios r where r.id = p_repertorio_id),
    false);
$$;

drop policy if exists "repertorios_select_publico" on public.repertorios;
drop policy if exists "repertorios_insert_livre" on public.repertorios;
drop policy if exists "repertorios_altera_conforme_dono" on public.repertorios;
drop policy if exists "repertorios_exclui_conforme_dono" on public.repertorios;

drop policy if exists "repertorios_select_dono_ou_ministerio" on public.repertorios;
create policy "repertorios_select_dono_ou_ministerio" on public.repertorios
  for select using (
    (auth_uid is not null and auth_uid = auth.uid())
    or (escala_id is not null
        and public.eh_membro((select e.ministerio_id from public.escalas e where e.id = repertorios.escala_id)))
  );
drop policy if exists "repertorios_insert_proprio" on public.repertorios;
create policy "repertorios_insert_proprio" on public.repertorios
  for insert with check (auth_uid is not null and auth_uid = auth.uid());
drop policy if exists "repertorios_update" on public.repertorios;
create policy "repertorios_update" on public.repertorios
  for update using (public.pode_editar_repertorio(id)) with check (public.pode_editar_repertorio(id));
drop policy if exists "repertorios_delete" on public.repertorios;
create policy "repertorios_delete" on public.repertorios
  for delete using (public.pode_editar_repertorio(id));

drop policy if exists "repertorio_musicas_select_publico" on public.repertorio_musicas;
drop policy if exists "repertorio_musicas_escreve_conforme_dono" on public.repertorio_musicas;
drop policy if exists "repertorio_musicas_select" on public.repertorio_musicas;
create policy "repertorio_musicas_select" on public.repertorio_musicas
  for select using (public.pode_ver_repertorio(repertorio_id));
drop policy if exists "repertorio_musicas_escreve" on public.repertorio_musicas;
create policy "repertorio_musicas_escreve" on public.repertorio_musicas
  for all using (public.pode_editar_repertorio(repertorio_id))
  with check (public.pode_editar_repertorio(repertorio_id));

drop policy if exists "repertorio_ritos_select_publico" on public.repertorio_ritos;
drop policy if exists "repertorio_ritos_escreve_conforme_dono" on public.repertorio_ritos;
drop policy if exists "repertorio_ritos_select" on public.repertorio_ritos;
create policy "repertorio_ritos_select" on public.repertorio_ritos
  for select using (public.pode_ver_repertorio(repertorio_id));
drop policy if exists "repertorio_ritos_escreve" on public.repertorio_ritos;
create policy "repertorio_ritos_escreve" on public.repertorio_ritos
  for all using (public.pode_editar_repertorio(repertorio_id))
  with check (public.pode_editar_repertorio(repertorio_id));

-- ----------------------------------------------------------
-- Compartilhamento por link
-- ----------------------------------------------------------
-- O link com share_token precisa abrir pra quem não é dono — mas isso não
-- pode virar "select using (true)", senão volta a dar pra listar tudo.
-- A RPC devolve um repertório só, e só se o token bater exatamente.
create or replace function public.repertorio_por_token(p_token text)
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
               'musicas', (select jsonb_build_object('title', m.title, 'artist', m.artist, 'original_tone', m.original_tone)
                             from public.musicas m where m.id = rm.musica_id)
             ) order by rm.ordem)
        from public.repertorio_musicas rm where rm.repertorio_id = r.id), '[]'::jsonb)
  )
  from public.repertorios r
  where p_token is not null and p_token <> '' and r.share_token = p_token;
$$;

/**
 * Backfill do dono nas linhas antigas: repertórios criados antes desta
 * migration só têm device_key, então ficariam invisíveis pro próprio
 * criador. O app chama isso uma vez por sessão passando a device_key
 * local; como device_key é um uuid v4 aleatório do localStorage (não
 * enumerável) e a linha órfã some do alcance assim que é reivindicada, a
 * janela de risco é a mesma já aceita no self-heal de membros.
 */
create or replace function public.reivindicar_repertorios_do_device(p_device_key text)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_qtd integer;
begin
  if v_uid is null or p_device_key is null or p_device_key = '' then
    return 0;
  end if;
  update public.repertorios
     set auth_uid = v_uid
   where device_key = p_device_key and auth_uid is null;
  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$$;

grant execute on function public.repertorio_por_token(text) to anon, authenticated;
grant execute on function public.reivindicar_repertorios_do_device(text) to authenticated;
