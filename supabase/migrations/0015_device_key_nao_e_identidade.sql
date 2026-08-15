-- ==========================================================
-- device_key deixa de valer como identidade dentro do ministério
-- ==========================================================
-- Sobrou um caminho de escalonamento depois de 0013: a aprovação de
-- ingresso casava a solicitação com a linha de membro pela device_key
-- (`on conflict (ministerio_id, device_key) do update set auth_uid`).
-- Como a device_key de todo mundo era legível por qualquer membro do
-- mesmo ministério, um membro comum podia pedir ingresso informando a
-- device_key do admin: ao aprovar — uma ação de boa-fé, que parece só
-- aceitar um pedido — o admin repassava a própria linha (e o próprio
-- admin=true) pro auth_uid de quem pediu.
--
-- Reproduzido em supabase/test/rls_ministerio.sql (seção 5).
--
-- Três mudanças fecham isso:
--   1. device_key sai do alcance da leitura (grant por coluna);
--   2. a identidade única do membro passa a ser o auth_uid;
--   3. a aprovação nunca mais toca numa linha que já existe.

-- ----------------------------------------------------------
-- 1. Ninguém lê a device_key alheia
-- ----------------------------------------------------------
-- O app não usa mais essa coluna em leitura nenhuma (ver ministerioApi.ts);
-- ela só serve pro self-heal das linhas antigas, feito por RPC security
-- definer, onde quem informa a chave é o próprio dono (localStorage).
--
-- Revogar só a coluna não adiantaria: enquanto existe SELECT na tabela
-- inteira, ele cobre todas as colunas. O caminho é tirar o SELECT da
-- tabela e devolvê-lo coluna a coluna.
revoke select on public.ministerio_membros from anon, authenticated;
grant select (id, ministerio_id, nome, avatar_cor, admin, aniversario, criado_em, auth_uid)
  on public.ministerio_membros to anon, authenticated;

-- ----------------------------------------------------------
-- 2. Identidade do membro = auth_uid
-- ----------------------------------------------------------
-- A unique antiga (ministerio_id, device_key) fazia dois papéis: evitar
-- duplicata do mesmo aparelho e servir de chave de conflito na aprovação.
-- O primeiro papel agora é do auth_uid; o segundo deixa de existir.
-- Linhas legadas (auth_uid nulo) ficam de fora da nova unique — elas ainda
-- esperam o dono aparecer.
alter table public.ministerio_membros
  drop constraint if exists ministerio_membros_ministerio_id_device_key_key;

create unique index if not exists idx_membros_ministerio_auth_uid
  on public.ministerio_membros (ministerio_id, auth_uid)
  where auth_uid is not null;

-- ----------------------------------------------------------
-- 3. Aprovação só cria linha nova
-- ----------------------------------------------------------
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
  if v_sol.auth_uid is null then
    raise exception 'solicitação sem conta vinculada';
  end if;

  -- Já é membro: consome a solicitação e devolve a linha existente, sem
  -- alterar coisa nenhuma nela.
  select id into v_membro_id from public.ministerio_membros
   where ministerio_id = v_sol.ministerio_id and auth_uid = v_sol.auth_uid;

  if v_membro_id is null then
    insert into public.ministerio_membros (ministerio_id, device_key, auth_uid, nome, avatar_cor, admin)
    values (v_sol.ministerio_id, v_sol.device_key, v_sol.auth_uid, v_sol.nome, 'bg-slate-500', false)
    returning id into v_membro_id;
  end if;

  delete from public.solicitacoes_ingresso where id = p_solicitacao_id;
  return v_membro_id;
end;
$$;

-- ----------------------------------------------------------
-- 4. Nenhum insert direto de membro
-- ----------------------------------------------------------
-- `membros_insert_fundador` existia pro app criar a própria linha ao
-- fundar um ministério; desde 0013 isso acontece dentro de
-- public.criar_ministerio(), que é security definer e não passa por
-- policy. O que sobrava era uma porta aberta pra um caso estranho: um
-- ministério que ficou sem nenhum membro (todos saíram) mas ainda tem
-- escalas, avisos e repertórios continuava "vazio" — e qualquer pessoa
-- podia se inserir nele como admin. Sem a policy, entrar em ministério só
-- pelas duas portas normais: fundar ou ser aprovado.
drop policy if exists "membros_insert_fundador" on public.ministerio_membros;

-- ----------------------------------------------------------
-- 5. Self-heal só resolve linha órfã do próprio ministério
-- ----------------------------------------------------------
-- Mesma função de antes, com uma guarda a mais: se esta conta já é membro
-- do ministério daquela linha órfã, não reivindica — senão daria pra
-- acumular duas linhas (e a nova unique recusaria de qualquer forma, com
-- um erro feio no meio do carregamento).
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
    update public.ministerio_membros m
       set auth_uid = v_uid
     where m.device_key = p_device_key
       and m.auth_uid is null
       and not exists (
         select 1 from public.ministerio_membros outro
          where outro.ministerio_id = m.ministerio_id
            and outro.auth_uid = v_uid
       )
    returning m.id;
end;
$$;
