#!/usr/bin/env bash
# Aplica as migrations num banco limpo e roda a suíte de testes de RLS.
# Precisa de um Postgres local — ver supabase/test/README.md.
#
#   ./supabase/test/rodar.sh
#
# Sai com código 1 se algum caso falhar (serve pra CI).
set -uo pipefail
cd "$(dirname "$0")/../.."

DB="${1:-cdm_test}"
PGHOST="${PGHOST:-/var/lib/postgresql/sock}"
PGPORT="${PGPORT:-5433}"
PGUSER="${PGUSER:-postgres}"
export PGHOST PGPORT PGUSER

falhou=0
total=0

for teste in supabase/test/rls_*.sql; do
  ./supabase/test/aplicar.sh "$DB" >/dev/null 2>&1 || { echo "erro ao aplicar as migrations"; exit 1; }
  saida=$(psql -q -d "$DB" -f "$teste" 2>&1)
  passou=$(echo "$saida" | grep -c 'NOTICE:  ok')
  total=$((total + passou))
  echo "== $(basename "$teste"): $passou caso(s) ok"
  if echo "$saida" | grep -qE 'ERROR|FALHOU'; then
    echo "$saida" | grep -E 'ERROR|FALHOU'
    falhou=1
  fi
done

if [ "$falhou" -eq 0 ]; then
  echo "todos os $total casos passaram"
fi
exit $falhou
