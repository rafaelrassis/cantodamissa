-- ==========================================================
-- Testes de RLS do catálogo (músicas, cantores, submissões) e dos
-- repertórios. Ver cabeçalho de rls_ministerio.sql para as convenções.
-- ==========================================================
\set ON_ERROR_STOP on

create schema if not exists teste;
grant usage on schema teste to anon, authenticated;

create or replace function teste.espera_bloqueio(p_sql text, p_desc text) returns void
language plpgsql as $$
declare n integer;
begin
  execute p_sql;
  get diagnostics n = row_count;
  if n > 0 then
    raise exception 'FALHOU (brecha aberta): % — afetou % linha(s)', p_desc, n;
  end if;
  raise notice 'ok (bloqueado): %', p_desc;
exception
  when insufficient_privilege then raise notice 'ok (bloqueado por policy): %', p_desc;
  when raise_exception then raise notice 'ok (bloqueado por trigger): %', p_desc;
end;
$$;

create or replace function teste.espera_ok(p_sql text, p_desc text) returns void
language plpgsql as $$
declare n integer;
begin
  execute p_sql;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'FALHOU (deveria permitir): % — 0 linhas', p_desc; end if;
  raise notice 'ok (permitido): %', p_desc;
exception
  when insufficient_privilege then
    raise exception 'FALHOU (deveria permitir): % — barrado pela policy', p_desc;
end;
$$;

create or replace function teste.espera_linhas(p_sql text, p_esperado integer, p_desc text) returns void
language plpgsql as $$
declare n integer;
begin
  execute 'select count(*) from (' || p_sql || ') s' into n;
  if n <> p_esperado then
    raise exception 'FALHOU: % — esperava %, veio %', p_desc, p_esperado, n;
  end if;
  raise notice 'ok (leitura): % (% linhas)', p_desc, n;
end;
$$;

grant execute on all functions in schema teste to anon, authenticated;

set role postgres;

insert into auth.users (id, email, is_anonymous) values
  ('aaaa0000-0000-0000-0000-00000000000a', 'admin@exemplo.com', false),
  ('bbbb0000-0000-0000-0000-00000000000b', 'fiel@exemplo.com', false),
  ('cccc0000-0000-0000-0000-00000000000c', null, true)
on conflict do nothing;

insert into public.admins (email) values ('admin@exemplo.com');

insert into public.musicas (id, slug, title, artist, original_tone, chords_content, views_count)
values ('dddd0000-0000-0000-0000-00000000000d', 'eis-me-aqui', 'Eis-me aqui', 'Pe. Zezinho', 'G', '[G]Eis-me aqui', 10);

insert into public.cantores (id, nome, slug) values
  ('eeee0000-0000-0000-0000-00000000000e', 'Pe. Zezinho', 'pe-zezinho');

-- ==========================================================
-- 1. Visitante comum (logado, mas fora da allowlist de admin)
-- ==========================================================
set role authenticated;
set request.jwt.claims = '{"sub":"bbbb0000-0000-0000-0000-00000000000b","email":"fiel@exemplo.com"}';
set request.jwt.claim.sub = 'bbbb0000-0000-0000-0000-00000000000b';

select teste.espera_linhas($$ select 1 from public.musicas $$, 1, 'catálogo continua de leitura pública');

select teste.espera_bloqueio($$ delete from public.musicas $$, 'visitante apagando o acervo inteiro');
select teste.espera_bloqueio($$
  update public.musicas set title = 'pichado', chords_content = 'lixo'
$$, 'visitante desfigurando cifras');
select teste.espera_bloqueio($$
  insert into public.musicas (slug, title, original_tone, chords_content)
  values ('spam', 'spam', 'C', '[C]spam')
$$, 'visitante cadastrando música');
select teste.espera_bloqueio($$ delete from public.cantores $$, 'visitante apagando cantores');

-- Tabelas que antes nem tinham RLS habilitada
select teste.espera_bloqueio($$
  insert into public.musica_momento (musica_id, momento)
  values ('dddd0000-0000-0000-0000-00000000000d', 'Comunhao')
$$, 'visitante escrevendo em musica_momento (tabela sem RLS antes)');
select teste.espera_bloqueio($$
  insert into public.domingos (data, nome, tempo, ciclo)
  values ('2027-01-03', 'falso', 'TempoComum', 'A')
$$, 'visitante escrevendo em domingos (tabela sem RLS antes)');
select teste.espera_bloqueio($$ delete from public.musica_tempo_liturgico $$,
  'visitante apagando classificação litúrgica');

-- A allowlist de admin não vaza pra quem não está nela
select teste.espera_linhas($$ select 1 from public.admins $$, 0, 'visitante lendo a lista de admins');

-- Contador de acessos: continua funcionando via RPC, sem abrir a tabela
do $$
declare v_antes integer; v_depois integer;
begin
  select views_count into v_antes from public.musicas where id = 'dddd0000-0000-0000-0000-00000000000d';
  perform public.registrar_visualizacao('dddd0000-0000-0000-0000-00000000000d');
  select views_count into v_depois from public.musicas where id = 'dddd0000-0000-0000-0000-00000000000d';
  if v_depois <> v_antes + 1 then
    raise exception 'FALHOU: registrar_visualizacao não incrementou (% -> %)', v_antes, v_depois;
  end if;
  raise notice 'ok (rpc): registrar_visualizacao incrementa views_count sem abrir a tabela';
end
$$;

-- Submissões da comunidade
select teste.espera_ok($$
  insert into public.submissoes (tipo, autor_nome, autor_auth_uid, title, chords_content)
  values ('correcao', 'Fiel', 'bbbb0000-0000-0000-0000-00000000000b', 'Eis-me aqui', '[G]corrigido')
$$, 'usuário enviando sugestão de correção');

select teste.espera_bloqueio($$
  update public.submissoes set status = 'aprovada'
$$, 'usuário aprovando a própria sugestão');

-- Solicitações de remoção (notice-and-takedown, ver 0029)
select teste.espera_ok($$
  insert into public.solicitacoes_remocao
    (alvo_tipo, musica_id, alvo_descricao, solicitante_nome, solicitante_email, motivo, autor_auth_uid)
  values
    ('musica', 'dddd0000-0000-0000-0000-00000000000d', 'Eis-me aqui', 'Detentor dos direitos',
     'detentor@exemplo.com', 'Uso não autorizado', 'bbbb0000-0000-0000-0000-00000000000b')
$$, 'usuário enviando pedido de remoção');

select teste.espera_linhas($$ select 1 from public.solicitacoes_remocao $$, 0,
  'quem pediu a remoção não enxerga a própria solicitação (não é crédito público)');

select teste.espera_bloqueio($$
  update public.solicitacoes_remocao set status = 'concluida'
$$, 'usuário concluindo a própria solicitação de remoção');

-- ==========================================================
-- 2. Admin de verdade (e-mail na tabela admins)
-- ==========================================================
set request.jwt.claims = '{"sub":"aaaa0000-0000-0000-0000-00000000000a","email":"ADMIN@Exemplo.com"}';
set request.jwt.claim.sub = 'aaaa0000-0000-0000-0000-00000000000a';

select teste.espera_ok($$
  insert into public.musicas (slug, title, original_tone, chords_content)
  values ('cordeiro-de-deus', 'Cordeiro de Deus', 'D', '[D]Cordeiro')
$$, 'admin cadastrando música (e-mail com caixa diferente)');

select teste.espera_ok($$
  insert into public.musica_momento (musica_id, momento)
  values ('dddd0000-0000-0000-0000-00000000000d', 'Comunhao')
$$, 'admin classificando música por momento');

select teste.espera_ok($$
  update public.musicas set title = 'Eis-me aqui, Senhor'
   where id = 'dddd0000-0000-0000-0000-00000000000d'
$$, 'admin editando música');

select teste.espera_linhas($$ select 1 from public.submissoes $$, 1, 'admin vendo as submissões pra moderar');

select teste.espera_ok($$ update public.submissoes set status = 'aprovada' $$, 'admin moderando submissão');

select teste.espera_linhas($$ select 1 from public.solicitacoes_remocao $$, 1,
  'admin vendo os pedidos de remoção pra moderar');
select teste.espera_ok($$
  update public.solicitacoes_remocao set status = 'concluida', resposta_admin = 'Removida'
$$, 'admin concluindo pedido de remoção');

-- ==========================================================
-- 3. Repertórios: dono por auth_uid, link por token
-- ==========================================================
set request.jwt.claims = '{"sub":"bbbb0000-0000-0000-0000-00000000000b","email":"fiel@exemplo.com"}';
set request.jwt.claim.sub = 'bbbb0000-0000-0000-0000-00000000000b';

do $$
declare v_id uuid;
begin
  insert into public.repertorios (nome, device_key, auth_uid)
  values ('Missa das 19h', 'device-fiel', 'bbbb0000-0000-0000-0000-00000000000b')
  returning id into v_id;
  insert into public.repertorio_ritos (repertorio_id, nome, ordem) values (v_id, 'Entrada', 0);
  insert into public.repertorio_musicas (repertorio_id, musica_id, ordem, momento)
  values (v_id, 'dddd0000-0000-0000-0000-00000000000d', 0, 'Entrada');
  raise notice 'ok: dono cria repertório com ritos e músicas';
end
$$;

select teste.espera_bloqueio($$
  insert into public.repertorios (nome, device_key, auth_uid)
  values ('roubado', 'device-fiel', 'cccc0000-0000-0000-0000-00000000000c')
$$, 'criar repertório em nome de outra conta');

-- Outra sessão (anônima) não enxerga nem edita o repertório alheio
set request.jwt.claim.sub = 'cccc0000-0000-0000-0000-00000000000c';
set request.jwt.claims = '{"sub":"cccc0000-0000-0000-0000-00000000000c"}';

select teste.espera_linhas($$ select 1 from public.repertorios $$, 0, 'terceiro listando repertórios alheios');
select teste.espera_linhas($$ select 1 from public.repertorio_musicas $$, 0, 'terceiro lendo itens de repertório alheio');
select teste.espera_bloqueio($$ delete from public.repertorios $$, 'terceiro apagando repertório alheio');
select teste.espera_bloqueio($$ update public.repertorios set nome = 'x' $$, 'terceiro renomeando repertório alheio');

-- ...mas o link compartilhado abre (e só o do token pedido).
-- O token vem de fora do banco (está na URL que a pessoa recebeu), então
-- aqui ele é lido sem RLS de propósito — a sessão de teste não enxerga a
-- linha, que é justamente o ponto.
set role postgres;
create table if not exists teste.token_compartilhado as
  select share_token from public.repertorios where nome = 'Missa das 19h';
grant select on teste.token_compartilhado to anon, authenticated;
set role authenticated;

do $$
declare v_token text; v_json jsonb;
begin
  select share_token into v_token from teste.token_compartilhado;
  v_json := public.repertorio_por_token(v_token);
  if v_json is null then raise exception 'FALHOU: link compartilhado não abriu pra terceiro'; end if;
  if jsonb_array_length(v_json -> 'repertorio_musicas') <> 1 then
    raise exception 'FALHOU: link compartilhado não trouxe as músicas';
  end if;
  if public.repertorio_por_token('token-inventado') is not null then
    raise exception 'FALHOU: token inválido devolveu repertório';
  end if;
  if public.repertorio_por_token('') is not null then
    raise exception 'FALHOU: token vazio devolveu repertório';
  end if;
  raise notice 'ok (rpc): link por token abre só o repertório do token';
end
$$;

-- Backfill do dono nas linhas antigas (device_key sem auth_uid)
set role postgres;
insert into public.repertorios (nome, device_key) values ('Repertório antigo', 'device-legado');
set role authenticated;

select teste.espera_linhas($$ select 1 from public.repertorios where nome = 'Repertório antigo' $$, 0,
  'repertório legado (sem dono) fica invisível até ser reivindicado');

do $$
declare v_qtd integer;
begin
  v_qtd := public.reivindicar_repertorios_do_device('device-legado');
  if v_qtd <> 1 then raise exception 'FALHOU: reivindicação devolveu %', v_qtd; end if;
  if not exists (select 1 from public.repertorios where nome = 'Repertório antigo') then
    raise exception 'FALHOU: repertório reivindicado continua invisível pro dono';
  end if;
  raise notice 'ok (rpc): device antigo reivindica os próprios repertórios';
end
$$;

set role postgres;
reset request.jwt.claim.sub;
reset request.jwt.claims;
