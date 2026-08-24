-- ==========================================================
-- Corrige RLS de igrejas: a policy "admin do ministério
-- gerencia igreja" (0019) só libera a linha pra quem já é
-- admin de um ministério com `igreja_id = igrejas.id` — o que
-- é impossível de satisfazer no INSERT de uma igreja nova,
-- porque nenhum ministério pode estar vinculado a uma linha
-- que ainda não existe (problema do ovo e da galinha).
--
-- Quem pode criar uma igreja é justamente quem tem a seção
-- "Igreja vinculada" nas Configurações do ministério: todo
-- admin de algum ministério. Criar uma igreja "solta" não vaza
-- nada (o nome fica público de qualquer forma, por
-- `buscar_igrejas`); o que precisa ficar protegido é vincular
-- um ministério a ela, e isso já é garantido pela RLS de
-- `ministerios` (só admin do próprio ministério altera
-- `igreja_id`, ver `ministerios_admin_altera` em 0013).
-- ==========================================================

create or replace function public.eh_admin_de_algum_ministerio()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ministerio_membros
    where auth_uid = auth.uid() and admin = true
  );
$$;

create policy "admin de algum ministério cria igreja"
  on public.igrejas for insert
  with check (public.eh_admin_de_algum_ministerio());
