#!/usr/bin/env bash
# Recria um banco limpo, aplica o stub do Supabase + todas as migrations em
# ordem e devolve o nome do banco. Uso: supabase/test/aplicar.sh [nome_do_banco]
set -euo pipefail

DB="${1:-cdm_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -q -h "${PGHOST:-/var/lib/postgresql/sock}" -p "${PGPORT:-5433}" -U "${PGUSER:-postgres}")

"${PSQL[@]}" -d postgres -c "drop database if exists $DB;" -c "create database $DB;"
"${PSQL[@]}" -d "$DB" -f supabase/test/00_supabase_stub.sql
for m in supabase/migrations/*.sql; do
  "${PSQL[@]}" -d "$DB" -f "$m"
done
"${PSQL[@]}" -d "$DB" -f supabase/test/99_grants.sql
echo "$DB"
