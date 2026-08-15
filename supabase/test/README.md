# Testes de RLS

As policies do Supabase são a única barreira real do app: a anon key vai no
bundle do front, então tudo que o Postgres permitir, qualquer pessoa com a
URL do projeto consegue fazer. Estes testes rodam as migrations num Postgres
local e exercitam as policies como um cliente exercitaria — inclusive os
casos de abuso.

## Rodando

Precisa de um PostgreSQL 15+ local. Numa máquina com o pacote do sistema:

```bash
export PGDATA=/var/lib/postgresql/rlstest
mkdir -p "$PGDATA" /var/lib/postgresql/sock
chown -R postgres:postgres "$PGDATA" /var/lib/postgresql/sock
su postgres -c "/usr/lib/postgresql/16/bin/initdb -D $PGDATA -A trust -U postgres"
su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D $PGDATA \
  -o \"-k /var/lib/postgresql/sock -p 5433 -c listen_addresses=''\" -l /tmp/pg.log start"

./supabase/test/rodar.sh
```

Com outro host/porta, exporte `PGHOST`/`PGPORT`/`PGUSER` antes de rodar.
Com Docker também serve:

```bash
docker run -d --name cdm-pg -e POSTGRES_HOST_AUTH_METHOD=trust -p 5433:5432 postgres:16
PGHOST=localhost PGPORT=5433 ./supabase/test/rodar.sh
```

## Arquivos

| Arquivo | O quê |
|---|---|
| `00_supabase_stub.sql` | Stub do ambiente Supabase: schema `auth`, roles `anon`/`authenticated`, `auth.uid()`, `auth.jwt()` e os grants padrão do schema `public` (é por causa deles que tabela sem RLS = tabela aberta). Só existe pro teste — em produção quem fornece isso é o Supabase. |
| `aplicar.sh` | Recria o banco e aplica stub + todas as migrations em ordem. |
| `rls_ministerio.sql` | Ministério: escalonamento de privilégio, leitura por membro, RPCs de fundar/ingressar/aprovar. |
| `rls_catalogo.sql` | Músicas, cantores, submissões, contador de acessos e repertórios. |
| `rodar.sh` | Roda tudo; sai com 1 se algum caso falhar. |

## Como escrever um caso

Cada bloco assume o papel de um usuário definindo os GUCs que o PostgREST
define por request, e usa três helpers:

```sql
set role authenticated;
set request.jwt.claim.sub = '<uuid da conta>';
set request.jwt.claims = '{"sub":"<uuid>","email":"pessoa@exemplo.com"}';  -- só onde o e-mail importa

select teste.espera_bloqueio('<sql>', 'descrição');  -- falha se escrever alguma linha
select teste.espera_ok('<sql>', 'descrição');        -- falha se NÃO conseguir
select teste.espera_linhas('<select>', 3, 'descrição');
```

`espera_bloqueio` trata os três jeitos de a barreira agir: erro de policy
(insert), zero linhas afetadas (update/delete barrado) e exceção de trigger
(colunas protegidas em `ministerio_membros`).
