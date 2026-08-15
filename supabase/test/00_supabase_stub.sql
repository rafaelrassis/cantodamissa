-- Stub mínimo do ambiente Supabase para testar as migrations e as policies
-- RLS num Postgres local (ver supabase/test/README.md). Não vai pra produção:
-- no projeto real quem fornece o schema auth, os roles e auth.uid()/auth.jwt()
-- é o próprio Supabase.

-- Roles são objetos do cluster (não do banco), então recriar o banco de
-- teste não os apaga — daí o create condicional.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text,
  is_anonymous boolean not null default false
);

-- auth.uid()/auth.jwt() leem os mesmos GUCs que o PostgREST define por request.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- Reproduz o grant padrão do Supabase: tudo que for criado no schema
-- public a partir daqui já nasce com CRUD liberado pro anon — é por isso
-- que "tabela sem RLS" equivale a tabela aberta na internet. Vai como
-- DEFAULT PRIVILEGES (e não como grant no fim da carga) porque é assim
-- que se comporta lá: um `revoke` dentro de uma migration precisa
-- continuar valendo depois dela.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
