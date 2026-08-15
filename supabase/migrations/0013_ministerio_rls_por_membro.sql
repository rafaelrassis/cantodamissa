-- ==========================================================
-- Ministério: fecha as brechas de escalonamento e a leitura pública
-- ==========================================================
-- Duas falhas graves nas policies de 0011 (reproduzidas em
-- supabase/test/rls_ministerio.sql):
--
-- 1) `membros_insert_self_ou_admin` permitia inserir uma linha de membro
--    com `admin = true` desde que `auth_uid = auth.uid()`. Como
--    `ministerios` tinha select público, qualquer visitante lia o id de
--    um ministério, abria uma sessão anônima e se inseria como admin
--    dele — ganhando poder de apagar escalas, membros e o ministério.
--
-- 2) `membros_vincula_auth_uid_legado` (o self-heal de linhas antigas)
--    dava UPDATE em qualquer linha com auth_uid nulo sem restringir as
--    demais colunas — dava pra reivindicar a linha E se promover a admin
--    no mesmo comando. Policies do mesmo comando são OR'd, então essa
--    valia como bypass da policy de admin ao lado.
--
-- Além disso, tudo no módulo tinha `select using (true)`: nomes,
-- aniversários, avisos e escalas de qualquer ministério eram legíveis por
-- qualquer um com a anon key.
--
-- A correção troca "confia no que o cliente mandou" por três coisas:
-- leitura restrita a membros, escrita de estruturas restrita a admin, e
-- os fluxos que precisam furar isso (fundar ministério, pedir ingresso,
-- aprovar, vincular device antigo) viram RPC `security definer` — que
-- valida a regra do lado do banco em vez de depender da policy.

-- ----------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------
create or replace function public.eh_membro(p_ministerio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ministerio_membros
    where ministerio_id = p_ministerio_id
      and auth_uid is not null
      and auth_uid = auth.uid()
  );
$$;

-- Usada nas policies de insert de membro: só o fundador entra sozinho, e
-- só enquanto o ministério ainda não tem ninguém. Precisa ser security
-- definer porque uma subquery na própria tabela dentro da policy dela
-- mesma dispara recursão infinita de RLS.
create or replace function public.ministerio_esta_vazio(p_ministerio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.ministerio_membros where ministerio_id = p_ministerio_id
  );
$$;

-- ----------------------------------------------------------
-- Trigger: colunas de poder só mudam por mão de admin
-- ----------------------------------------------------------
-- RLS decide linha, não coluna. Como o próprio membro precisa poder
-- editar nome/avatar/aniversário da própria linha, a garantia de que ele
-- não se promove a admin (nem se muda de ministério, nem rouba a linha de
-- outro auth_uid) fica neste trigger.
create or replace function public.protege_colunas_membro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.eh_admin(old.ministerio_id) then
    return new;
  end if;
  if new.admin is distinct from old.admin then
    raise exception 'só admin do ministério pode alterar o campo admin';
  end if;
  if new.ministerio_id is distinct from old.ministerio_id then
    raise exception 'não é possível mover um membro de ministério';
  end if;
  if new.auth_uid is distinct from old.auth_uid then
    raise exception 'não é possível alterar o vínculo de conta de um membro';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protege_colunas_membro on public.ministerio_membros;
create trigger trg_protege_colunas_membro
  before update on public.ministerio_membros
  for each row execute function public.protege_colunas_membro();

-- ----------------------------------------------------------
-- ministerios
-- ----------------------------------------------------------
drop policy if exists "ministerios_select_publico" on public.ministerios;
drop policy if exists "ministerios_insert_livre" on public.ministerios;
drop policy if exists "ministerios_admin_altera" on public.ministerios;
drop policy if exists "ministerios_admin_exclui" on public.ministerios;

create policy "ministerios_select_membro" on public.ministerios
  for select using (public.eh_membro(id));
-- Criar ministério é livre, mas a linha nasce órfã: só vira "meu" quando
-- o membro fundador é inserido (ver policy membros_insert_fundador). O
-- app faz os dois passos dentro de public.criar_ministerio().
create policy "ministerios_insert_livre" on public.ministerios
  for insert with check (true);
create policy "ministerios_admin_altera" on public.ministerios
  for update using (public.eh_admin(id)) with check (public.eh_admin(id));
create policy "ministerios_admin_exclui" on public.ministerios
  for delete using (public.eh_admin(id));

-- ----------------------------------------------------------
-- ministerio_membros
-- ----------------------------------------------------------
drop policy if exists "membros_select_publico" on public.ministerio_membros;
drop policy if exists "membros_insert_self_ou_admin" on public.ministerio_membros;
drop policy if exists "membros_admin_altera" on public.ministerio_membros;
drop policy if exists "membros_vincula_auth_uid_legado" on public.ministerio_membros;
drop policy if exists "membros_admin_remove" on public.ministerio_membros;
drop policy if exists "membros_sai_sozinho" on public.ministerio_membros;

-- Leitura: a equipe se enxerga; e a própria linha sempre (necessário pro
-- app descobrir a que ministérios a conta pertence).
create policy "membros_select_equipe" on public.ministerio_membros
  for select using (
    (auth_uid is not null and auth_uid = auth.uid())
    or public.eh_membro(ministerio_id)
  );

-- Entrar sozinho só como fundador do ministério recém-criado. Todo o
-- resto (aprovar solicitação) passa por public.aprovar_solicitacao().
create policy "membros_insert_fundador" on public.ministerio_membros
  for insert with check (
    auth_uid is not null
    and auth_uid = auth.uid()
    and public.ministerio_esta_vazio(ministerio_id)
  );

create policy "membros_admin_altera" on public.ministerio_membros
  for update using (public.eh_admin(ministerio_id)) with check (public.eh_admin(ministerio_id));
-- O próprio membro edita a própria linha; o trigger acima garante que
-- `admin`, `ministerio_id` e `auth_uid` continuam fora do alcance dele.
create policy "membros_edita_a_propria_linha" on public.ministerio_membros
  for update using (auth_uid is not null and auth_uid = auth.uid())
  with check (auth_uid is not null and auth_uid = auth.uid());

create policy "membros_admin_remove" on public.ministerio_membros
  for delete using (public.eh_admin(ministerio_id));
create policy "membros_sai_sozinho" on public.ministerio_membros
  for delete using (auth_uid is not null and auth_uid = auth.uid());

-- ----------------------------------------------------------
-- solicitacoes_ingresso
-- ----------------------------------------------------------
drop policy if exists "solicitacoes_select_publico" on public.solicitacoes_ingresso;
drop policy if exists "solicitacoes_insert_livre" on public.solicitacoes_ingresso;
drop policy if exists "solicitacoes_admin_resolve" on public.solicitacoes_ingresso;

create policy "solicitacoes_select_admin_ou_autor" on public.solicitacoes_ingresso
  for select using (
    public.eh_admin(ministerio_id)
    or (auth_uid is not null and auth_uid = auth.uid())
  );
-- Insert só via public.solicitar_ingresso(): sem select público em
-- `ministerios`, o cliente nem consegue mais resolver código -> id sozinho.
create policy "solicitacoes_admin_resolve" on public.solicitacoes_ingresso
  for delete using (
    public.eh_admin(ministerio_id)
    or (auth_uid is not null and auth_uid = auth.uid())
  );

-- ----------------------------------------------------------
-- Demais tabelas do ministério: leitura de membro, escrita de admin
-- ----------------------------------------------------------
drop policy if exists "funcoes_select_publico" on public.funcoes;
create policy "funcoes_select_membro" on public.funcoes for select using (public.eh_membro(ministerio_id));

drop policy if exists "membro_funcoes_select_publico" on public.membro_funcoes;
create policy "membro_funcoes_select_membro" on public.membro_funcoes for select
  using (public.eh_membro((select ministerio_id from public.funcoes where id = membro_funcoes.funcao_id)));

drop policy if exists "avisos_select_publico" on public.avisos;
create policy "avisos_select_membro" on public.avisos for select using (public.eh_membro(ministerio_id));

drop policy if exists "equipes_select_publico" on public.equipes;
create policy "equipes_select_membro" on public.equipes for select using (public.eh_membro(ministerio_id));

drop policy if exists "equipe_membros_select_publico" on public.equipe_membros;
create policy "equipe_membros_select_membro" on public.equipe_membros for select
  using (public.eh_membro((select ministerio_id from public.equipes where id = equipe_membros.equipe_id)));

drop policy if exists "modelos_roteiro_select_publico" on public.modelos_roteiro;
create policy "modelos_roteiro_select_membro" on public.modelos_roteiro for select
  using (public.eh_membro(ministerio_id));

drop policy if exists "modelo_roteiro_itens_select_publico" on public.modelo_roteiro_itens;
create policy "modelo_roteiro_itens_select_membro" on public.modelo_roteiro_itens for select
  using (public.eh_membro((select ministerio_id from public.modelos_roteiro where id = modelo_roteiro_itens.modelo_id)));

drop policy if exists "escalas_select_publico" on public.escalas;
create policy "escalas_select_membro" on public.escalas for select using (public.eh_membro(ministerio_id));

drop policy if exists "roteiro_itens_select_publico" on public.roteiro_itens;
create policy "roteiro_itens_select_membro" on public.roteiro_itens for select
  using (public.eh_membro((select ministerio_id from public.escalas where id = roteiro_itens.escala_id)));

drop policy if exists "participantes_select_publico" on public.escala_participantes;
create policy "participantes_select_membro" on public.escala_participantes for select
  using (public.eh_membro((select ministerio_id from public.escalas where id = escala_participantes.escala_id)));

drop policy if exists "indisponibilidades_select_publico" on public.indisponibilidades;
create policy "indisponibilidades_select_membro" on public.indisponibilidades for select
  using (public.eh_membro(ministerio_id));

-- ----------------------------------------------------------
-- RPCs dos fluxos que precisam furar as policies acima
-- ----------------------------------------------------------

/** Limite de ministérios por conta — espelha LIMITE_MINISTERIOS no app. */
create or replace function public.limite_ministerios()
returns integer language sql immutable as $$ select 5 $$;

create or replace function public.gerar_codigo_convite()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidato text;
  i integer;
begin
  -- tenta até achar um código livre: o espaço é pequeno (32^4), então
  -- colidir é plausível e o unique da coluna derrubaria o insert.
  for tentativa in 1..50 loop
    candidato := 'CDM-';
    for i in 1..4 loop
      candidato := candidato || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    if not exists (select 1 from public.ministerios where codigo_convite = candidato) then
      return candidato;
    end if;
  end loop;
  raise exception 'não foi possível gerar um código de convite livre';
end;
$$;

/**
 * Funda um ministério: cria a linha, o membro admin e as funções numa
 * transação só. Antes isso eram três inserts soltos no cliente — se o
 * segundo falhasse, sobrava um ministério fantasma sem dono (e sem dono
 * ninguém consegue apagar, porque delete exige eh_admin).
 */
create or replace function public.criar_ministerio(
  p_nome text,
  p_device_key text,
  p_nome_membro text default 'Você',
  p_aniversario date default null,
  p_funcoes jsonb default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_qtd integer;
begin
  if v_uid is null then
    raise exception 'é preciso uma sessão ativa pra criar um ministério';
  end if;

  select count(*) into v_qtd from public.ministerio_membros where auth_uid = v_uid;
  if v_qtd >= public.limite_ministerios() then
    raise exception 'LIMITE_MINISTERIOS';
  end if;

  insert into public.ministerios (nome, codigo_convite, criado_por_device_key)
  values (p_nome, public.gerar_codigo_convite(), p_device_key)
  returning id into v_id;

  insert into public.ministerio_membros (ministerio_id, device_key, auth_uid, nome, avatar_cor, admin, aniversario)
  values (v_id, p_device_key, v_uid, coalesce(nullif(p_nome_membro, ''), 'Você'), 'bg-teal-500', true, p_aniversario);

  insert into public.funcoes (ministerio_id, nome, icone)
  select v_id, item ->> 'nome', coalesce(item ->> 'icone', '🎵')
  from jsonb_array_elements(coalesce(p_funcoes, '[]'::jsonb)) as item;

  return v_id;
end;
$$;

/**
 * Pede ingresso por código. Resolve código -> ministério do lado do banco
 * (o cliente não enxerga mais `ministerios` de que não participa) e
 * devolve um status pro app traduzir em mensagem.
 */
create or replace function public.solicitar_ingresso(
  p_codigo text,
  p_nome text,
  p_device_key text
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ministerio_id uuid;
  v_qtd integer;
begin
  if v_uid is null then
    raise exception 'é preciso uma sessão ativa pra pedir ingresso';
  end if;

  select id into v_ministerio_id from public.ministerios
   where codigo_convite = upper(trim(p_codigo));
  if v_ministerio_id is null then
    return 'CODIGO_INVALIDO';
  end if;

  if exists (select 1 from public.ministerio_membros
              where ministerio_id = v_ministerio_id and auth_uid = v_uid) then
    return 'JA_MEMBRO';
  end if;

  select count(*) into v_qtd from public.ministerio_membros where auth_uid = v_uid;
  if v_qtd >= public.limite_ministerios() then
    return 'LIMITE_MINISTERIOS';
  end if;

  if exists (select 1 from public.solicitacoes_ingresso
              where ministerio_id = v_ministerio_id and auth_uid = v_uid and status = 'pendente') then
    return 'JA_SOLICITADO';
  end if;

  insert into public.solicitacoes_ingresso (ministerio_id, device_key, auth_uid, nome, codigo_usado)
  values (v_ministerio_id, p_device_key, v_uid, p_nome, upper(trim(p_codigo)));

  return 'OK';
end;
$$;

/**
 * Aprova uma solicitação: cria o membro (sempre não-admin) e apaga a
 * solicitação. Só admin do ministério em questão.
 */
create or replace function public.aprovar_solicitacao(p_solicitacao_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_sol public.solicitacoes_ingresso;
  v_membro_id uuid;
begin
  select * into v_sol from public.solicitacoes_ingresso where id = p_solicitacao_id;
  if v_sol.id is null then
    raise exception 'solicitação não encontrada';
  end if;
  if not public.eh_admin(v_sol.ministerio_id) then
    raise exception 'só admin do ministério pode aprovar ingresso';
  end if;

  insert into public.ministerio_membros (ministerio_id, device_key, auth_uid, nome, avatar_cor, admin)
  values (v_sol.ministerio_id, v_sol.device_key, v_sol.auth_uid, v_sol.nome, 'bg-slate-500', false)
  on conflict (ministerio_id, device_key) do update set auth_uid = excluded.auth_uid
  returning id into v_membro_id;

  delete from public.solicitacoes_ingresso where id = p_solicitacao_id;
  return v_membro_id;
end;
$$;

/**
 * Vincula a sessão atual a uma linha de membro criada antes de existir
 * auth_uid (device_key é o único identificador que ela tem). Grava só o
 * auth_uid — nunca `admin` —, que é o que faltava na policy antiga.
 * Retorna o id do membro vinculado, ou null se não havia linha órfã.
 */
create or replace function public.vincular_membro_legado(p_device_key text)
returns setof uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_device_key is null or p_device_key = '' then
    return;
  end if;
  return query
    update public.ministerio_membros
       set auth_uid = v_uid
     where device_key = p_device_key
       and auth_uid is null
    returning id;
end;
$$;

/** Ministérios da conta atual (id + nome), em ordem de ingresso. */
create or replace function public.meus_ministerios()
returns table (id uuid, nome text)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.nome
    from public.ministerio_membros mm
    join public.ministerios m on m.id = mm.ministerio_id
   where mm.auth_uid = auth.uid()
   order by mm.criado_em asc;
$$;

grant execute on function public.criar_ministerio(text, text, text, date, jsonb) to authenticated;
grant execute on function public.solicitar_ingresso(text, text, text) to authenticated;
grant execute on function public.aprovar_solicitacao(uuid) to authenticated;
grant execute on function public.vincular_membro_legado(text) to authenticated;
grant execute on function public.meus_ministerios() to authenticated;
grant execute on function public.eh_membro(uuid) to anon, authenticated;
