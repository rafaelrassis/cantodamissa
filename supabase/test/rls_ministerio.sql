-- ==========================================================
-- Testes de RLS do Ministério (rodar com supabase/test/rodar.sh)
-- ==========================================================
-- Cada caso roda como o role `authenticated` com um auth.uid() falso no
-- GUC (é o que o PostgREST faz por request), então exercita as policies
-- exatamente como um cliente com a anon key exercitaria.
--
-- Convenção: `espera_bloqueio` falha o teste se o comando conseguir
-- escrever alguma linha; `espera_ok` falha se NÃO conseguir.

\set ON_ERROR_STOP on

create schema if not exists teste;
grant usage on schema teste to anon, authenticated;

-- Executa p_sql e falha se ele tiver afetado alguma linha. RLS barra de
-- duas formas diferentes: insert violado levanta 42501, update/delete
-- barrado simplesmente não casa linha nenhuma (0 rows, sem erro) — as
-- duas contam como "bloqueado".
create or replace function teste.espera_bloqueio(p_sql text, p_desc text) returns void
language plpgsql as $$
declare
  n integer;
begin
  execute p_sql;
  get diagnostics n = row_count;
  if n > 0 then
    raise exception 'FALHOU (brecha aberta): % — afetou % linha(s)', p_desc, n;
  end if;
  raise notice 'ok (bloqueado): %', p_desc;
exception
  when insufficient_privilege then
    raise notice 'ok (bloqueado por policy): %', p_desc;
  when raise_exception then
    -- trigger de proteção de colunas (ver protege_colunas_membro)
    raise notice 'ok (bloqueado por trigger): % [%]', p_desc, sqlerrm;
end;
$$;

create or replace function teste.espera_ok(p_sql text, p_desc text) returns void
language plpgsql as $$
declare
  n integer;
begin
  execute p_sql;
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'FALHOU (deveria permitir): % — 0 linhas', p_desc;
  end if;
  raise notice 'ok (permitido): %', p_desc;
exception
  when insufficient_privilege then
    raise exception 'FALHOU (deveria permitir): % — barrado pela policy', p_desc;
end;
$$;

create or replace function teste.espera_linhas(p_sql text, p_esperado integer, p_desc text) returns void
language plpgsql as $$
declare
  n integer;
begin
  execute 'select count(*) from (' || p_sql || ') s' into n;
  if n <> p_esperado then
    raise exception 'FALHOU: % — esperava % linha(s), veio %', p_desc, p_esperado, n;
  end if;
  raise notice 'ok (leitura): % (% linhas)', p_desc, n;
end;
$$;

grant execute on all functions in schema teste to anon, authenticated;

-- ----------------------------------------------------------
-- Cenário: ministério "Santa Cecília" com um admin de verdade (Ana),
-- um membro comum (Bruno) e uma linha legada sem auth_uid (Carlos,
-- criado antes da migration 0011).
-- ----------------------------------------------------------
set role postgres;

insert into auth.users (id, email, is_anonymous) values
  ('11111111-1111-1111-1111-111111111111', 'ana@exemplo.com', false),
  ('22222222-2222-2222-2222-222222222222', 'bruno@exemplo.com', false),
  ('99999999-9999-9999-9999-999999999999', null, true)  -- invasor: sessão anônima
on conflict do nothing;

insert into public.ministerios (id, nome, codigo_convite, criado_por_device_key)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'Santa Cecília', 'CDM-TEST', 'device-ana');

insert into public.ministerio_membros (id, ministerio_id, device_key, nome, admin, auth_uid) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'device-ana', 'Ana', true, '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'device-bruno', 'Bruno', false, '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'device-carlos', 'Carlos', true, null);

insert into public.escalas (id, ministerio_id, titulo, data, hora)
values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Missa das 19h', '2026-09-06', '19:00');

-- ==========================================================
-- 1. Invasor (sessão anônima, nunca foi convidado)
-- ==========================================================
set role authenticated;
set request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';

select teste.espera_bloqueio($$
  insert into public.ministerio_membros (ministerio_id, device_key, nome, admin, auth_uid)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'device-invasor', 'Invasor', true,
          '99999999-9999-9999-9999-999999999999')
$$, 'invasor se auto-inserindo como admin do ministério alheio');

select teste.espera_bloqueio($$
  insert into public.ministerio_membros (ministerio_id, device_key, nome, admin, auth_uid)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'device-invasor', 'Invasor', false,
          '99999999-9999-9999-9999-999999999999')
$$, 'invasor se auto-inserindo como membro comum (sem aprovação)');

select teste.espera_bloqueio($$
  update public.ministerio_membros
     set auth_uid = '99999999-9999-9999-9999-999999999999', admin = true
   where id = 'bbbbbbbb-0000-0000-0000-000000000003'
$$, 'invasor sequestrando linha legada (auth_uid nulo) e virando admin');

select teste.espera_bloqueio($$
  update public.ministerio_membros set admin = true
   where id = 'bbbbbbbb-0000-0000-0000-000000000002'
$$, 'invasor promovendo membro existente a admin');

select teste.espera_bloqueio($$
  update public.ministerios set nome = 'Hackeado'
   where id = 'aaaaaaaa-0000-0000-0000-000000000001'
$$, 'invasor renomeando ministério');

select teste.espera_bloqueio($$
  delete from public.ministerios where id = 'aaaaaaaa-0000-0000-0000-000000000001'
$$, 'invasor excluindo ministério');

select teste.espera_bloqueio($$
  delete from public.escalas where id = 'cccccccc-0000-0000-0000-000000000001'
$$, 'invasor excluindo escala');

select teste.espera_bloqueio($$
  insert into public.avisos (ministerio_id, titulo)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'aviso falso')
$$, 'invasor publicando aviso');

-- Leitura: quem não é membro não enxerga o ministério nem a equipe.
select teste.espera_linhas($$
  select 1 from public.ministerios where id = 'aaaaaaaa-0000-0000-0000-000000000001'
$$, 0, 'invasor lendo ministério alheio');

select teste.espera_linhas($$
  select 1 from public.ministerio_membros where ministerio_id = 'aaaaaaaa-0000-0000-0000-000000000001'
$$, 0, 'invasor lendo lista de membros (nomes/aniversários)');

select teste.espera_linhas($$
  select 1 from public.escalas where ministerio_id = 'aaaaaaaa-0000-0000-0000-000000000001'
$$, 0, 'invasor lendo escalas');

-- ==========================================================
-- 2. Membro comum (Bruno) — lê tudo do ministério, não administra
-- ==========================================================
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select teste.espera_linhas($$
  select 1 from public.ministerio_membros where ministerio_id = 'aaaaaaaa-0000-0000-0000-000000000001'
$$, 3, 'membro lendo a própria equipe');

select teste.espera_bloqueio($$
  update public.ministerio_membros set admin = true
   where id = 'bbbbbbbb-0000-0000-0000-000000000002'
$$, 'membro comum se promovendo a admin');

select teste.espera_bloqueio($$
  delete from public.escalas where id = 'cccccccc-0000-0000-0000-000000000001'
$$, 'membro comum excluindo escala');

-- O que o membro PODE: confirmar a própria presença e sair do ministério.
set role postgres;
insert into public.escala_participantes (escala_id, membro_id, status)
values ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'pendente');
set role authenticated;

select teste.espera_ok($$
  update public.escala_participantes set status = 'confirmado'
   where escala_id = 'cccccccc-0000-0000-0000-000000000001'
     and membro_id = 'bbbbbbbb-0000-0000-0000-000000000002'
$$, 'membro confirmando a própria presença');

select teste.espera_bloqueio($$
  update public.escala_participantes set status = 'recusado'
   where membro_id = 'bbbbbbbb-0000-0000-0000-000000000001'
$$, 'membro recusando presença de outra pessoa');

-- ==========================================================
-- 3. Admin de verdade (Ana) — administra o próprio ministério
-- ==========================================================
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select teste.espera_ok($$
  update public.ministerios set nome = 'Santa Cecília (renomeado)'
   where id = 'aaaaaaaa-0000-0000-0000-000000000001'
$$, 'admin renomeando o próprio ministério');

select teste.espera_ok($$
  update public.ministerio_membros set admin = true
   where id = 'bbbbbbbb-0000-0000-0000-000000000002'
$$, 'admin promovendo membro');

select teste.espera_ok($$
  insert into public.avisos (ministerio_id, titulo)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'ensaio sexta 20h')
$$, 'admin publicando aviso');

select teste.espera_ok($$
  update public.escalas set titulo = 'Missa das 19h30'
   where id = 'cccccccc-0000-0000-0000-000000000001'
$$, 'admin editando escala');

-- ==========================================================
-- 4. Fluxos legítimos que passaram a depender de RPC
-- ==========================================================

-- Fundar um ministério do zero (invasor tem todo direito de criar o dele).
set request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';

do $$
declare v_id uuid;
begin
  v_id := public.criar_ministerio('Meu Ministério', 'device-invasor', 'Zé', null,
            '[{"nome":"Violão","icone":"🪕"},{"nome":"Teclado","icone":"🎹"}]'::jsonb);
  if v_id is null then raise exception 'FALHOU: criar_ministerio não devolveu id'; end if;
  if not public.eh_admin(v_id) then raise exception 'FALHOU: fundador não ficou admin'; end if;
  if (select count(*) from public.funcoes where ministerio_id = v_id) <> 2 then
    raise exception 'FALHOU: funções personalizadas não foram semeadas';
  end if;
  raise notice 'ok (rpc): fundar ministério deixa o criador admin com as funções escolhidas';
end
$$;

-- Pedir ingresso por código, sem enxergar o ministério alheio.
do $$
declare v_status text;
begin
  v_status := public.solicitar_ingresso('cdm-test', 'Zé', 'device-invasor');
  if v_status <> 'OK' then raise exception 'FALHOU: solicitar_ingresso devolveu %', v_status; end if;
  v_status := public.solicitar_ingresso('CDM-TEST', 'Zé', 'device-invasor');
  if v_status <> 'JA_SOLICITADO' then raise exception 'FALHOU: solicitação duplicada devolveu %', v_status; end if;
  v_status := public.solicitar_ingresso('CDM-XXXX', 'Zé', 'device-invasor');
  if v_status <> 'CODIGO_INVALIDO' then raise exception 'FALHOU: código inexistente devolveu %', v_status; end if;
  raise notice 'ok (rpc): solicitar ingresso por código (normaliza, deduplica e recusa código inválido)';
end
$$;

-- Solicitante não pode se aprovar sozinho.
do $$
declare v_sol uuid;
begin
  select id into v_sol from public.solicitacoes_ingresso
   where auth_uid = '99999999-9999-9999-9999-999999999999' limit 1;
  if v_sol is null then raise exception 'FALHOU: solicitante não enxerga a própria solicitação'; end if;
  begin
    perform public.aprovar_solicitacao(v_sol);
    raise exception 'FALHOU (brecha aberta): solicitante aprovou o próprio ingresso';
  exception when others then
    if sqlerrm like 'FALHOU%' then raise; end if;
    raise notice 'ok (rpc): solicitante não consegue aprovar o próprio ingresso';
  end;
end
$$;

-- Admin aprova; o novo membro entra sem poderes de admin.
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$
declare v_sol uuid; v_membro uuid;
begin
  select id into v_sol from public.solicitacoes_ingresso
   where ministerio_id = 'aaaaaaaa-0000-0000-0000-000000000001' limit 1;
  v_membro := public.aprovar_solicitacao(v_sol);
  if (select admin from public.ministerio_membros where id = v_membro) then
    raise exception 'FALHOU: membro aprovado entrou como admin';
  end if;
  if exists (select 1 from public.solicitacoes_ingresso where id = v_sol) then
    raise exception 'FALHOU: solicitação não foi consumida na aprovação';
  end if;
  raise notice 'ok (rpc): admin aprova ingresso e o novo membro entra sem admin';
end
$$;

-- Já como membro comum, o recém-aprovado continua sem poder se promover
-- (agora o bloqueio vem do trigger de colunas, não da policy).
set request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';
do $$
begin
  begin
    update public.ministerio_membros set admin = true
     where auth_uid = '99999999-9999-9999-9999-999999999999'
       and ministerio_id = 'aaaaaaaa-0000-0000-0000-000000000001';
    raise exception 'FALHOU (brecha aberta): membro se promoveu a admin editando a própria linha';
  exception when others then
    if sqlerrm like 'FALHOU%' then raise; end if;
    raise notice 'ok (trigger): membro não se promove editando a própria linha';
  end;
end
$$;

select teste.espera_ok($$
  update public.ministerio_membros set nome = 'José', avatar_cor = 'bg-rose-500'
   where auth_uid = '99999999-9999-9999-9999-999999999999'
     and ministerio_id = 'aaaaaaaa-0000-0000-0000-000000000001'
$$, 'membro editando o próprio nome/avatar');

select teste.espera_ok($$
  delete from public.ministerio_membros
   where auth_uid = '99999999-9999-9999-9999-999999999999'
     and ministerio_id = 'aaaaaaaa-0000-0000-0000-000000000001'
$$, 'membro saindo do ministério por conta própria');

set role postgres;
reset request.jwt.claim.sub;
