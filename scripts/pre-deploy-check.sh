#!/bin/bash
# Validação básica antes de subir para produção (main).
# Não substitui os passos manuais (env vars na Vercel, backup do banco,
# declaração da Play Console) — só cobre o que dá pra checar por aqui.
set -e

echo "== 1. Type check =="
npx tsc -b

echo "== 2. Build =="
npx vite build

echo "== 3. Testes =="
npm test -- --run

echo "== 4. Grep por TODOs/FIXMEs em api/ e src/ =="
grep -rn "\bTODO\b\|\bFIXME\b" api/ src/ 2>/dev/null || echo "nenhum encontrado"

echo "== 5. Endpoints de import de cifra (api/) exigem admin =="
for f in api/cifraclub-import.ts api/cifra-pdf-extract.ts; do
  if grep -q "exigirAdmin" "$f" 2>/dev/null; then
    echo "✅ $f chama exigirAdmin"
  else
    echo "⚠️  $f não chama exigirAdmin — endpoint pode estar aberto"
  fi
done

echo "== 6. Env vars esperadas (servidor, local) =="
# SUPABASE_URL/SUPABASE_ANON_KEY são as usadas por api/_auth.ts; sem elas
# os endpoints admin recusam tudo com 500 (ver _auth.ts). VITE_SENTRY_DSN é
# opcional (sem ela o app roda normal, só não reporta erro).
# Não existe mais VITE_ADMIN_EMAILS — quem é admin sai da tabela `admins`
# no banco (ver README.md, seção Administradores).
for v in SUPABASE_URL SUPABASE_ANON_KEY VITE_SENTRY_DSN; do
  if [ -z "${!v}" ]; then
    echo "⚠️  $v não setada no shell local (confira no Vercel Dashboard > Production)"
  else
    echo "✅ $v setada"
  fi
done

echo "== Pronto. Revise os ⚠️ acima antes de subir para main. =="
echo "Passos manuais que este script não cobre: env vars de Produção na"
echo "Vercel, backup do Postgres (pg_dump), smoke test do Sentry em prod,"
echo "e a declaração de anúncios na Play Console."
