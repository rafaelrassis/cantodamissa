-- ==========================================================
-- Conserta o vínculo das linhas legadas, que 0013 tinha travado
-- ==========================================================
-- O trigger protege_colunas_membro (0013) recusa qualquer alteração de
-- auth_uid feita por quem não é admin do ministério. A intenção era
-- fechar o sequestro de linha; o efeito colateral era travar justamente
-- a migração de todo mundo:
--
--   vincular_membro_legado() é security definer, então passa por cima das
--   policies — mas trigger não é policy: ele roda sempre, inclusive
--   dentro de uma função security definer. Como o usuário legado ainda
--   não está vinculado, eh_admin() é falso pra ele e o próprio self-heal
--   levantava "não é possível alterar o vínculo de conta de um membro".
--
-- Na prática: depois do deploy, todo usuário que já usava o app veria o
-- ministério sumir da tela, sem forma de recuperar pela interface.
-- Reproduzido em supabase/test/rls_ministerio.sql (seção 6).
--
-- A saída é o trigger reconhecer a única transição legítima — de auth_uid
-- nulo pro dono que está se apresentando — e só quando ela vem de dentro
-- da RPC, que é quem confere a device_key. A marca é um GUC local, que
-- vale só até o fim da transação e não pode ser forjado pelo PostgREST
-- (`set local` não é acessível por quem só faz REST).

create or replace function public.protege_colunas_membro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vinculando boolean := coalesce(current_setting('app.vinculo_legado', true), '') = 'on';
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
    -- Única exceção: adotar uma linha órfã, de dentro de
    -- vincular_membro_legado() e em nome de quem está pedindo.
    if not (v_vinculando and old.auth_uid is null and new.auth_uid = auth.uid()) then
      raise exception 'não é possível alterar o vínculo de conta de um membro';
    end if;
  end if;
  return new;
end;
$$;

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

  -- `set local`: vale só nesta transação, some ao terminar.
  perform set_config('app.vinculo_legado', 'on', true);

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
