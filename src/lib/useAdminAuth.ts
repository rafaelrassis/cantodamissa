/**
 * "Área Admin" não tem login próprio — é o mesmo login Google único do
 * app. Quem é admin é decidido comparando o e-mail da sessão contra a
 * allowlist em VITE_ADMIN_EMAILS (lista separada por vírgula, configurada
 * no ambiente/Vercel). Sem sessão ou e-mail fora da lista, isAdmin = false
 * e o botão de Área Admin nem aparece (ver Home.tsx/App.tsx).
 *
 * Isso é conveniência de UI, não segurança de verdade — a allowlist só
 * decide o que aparece no client. Qualquer ação real do AdminPanel que
 * grava no banco deve continuar protegida por RLS/policy no Supabase, não
 * só por este check.
 */
function listaAdmins(): string[] {
  const bruto = import.meta.env.VITE_ADMIN_EMAILS ?? '';
  return bruto
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function useAdminAuth(email: string | null) {
  const isAdmin = !!email && listaAdmins().includes(email.toLowerCase());
  return { isAdmin };
}
