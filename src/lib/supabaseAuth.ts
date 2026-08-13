import { supabase, isSupabaseConfigured } from './supabase';

// Sem isso, "RLS restrita a admin" seria só decoração: o app usa a chave
// pública no navegador, e sem uma sessão de verdade o Postgres não tem
// como saber quem está perguntando — qualquer um poderia alegar ser
// qualquer device_key numa query direta à API. Anonymous Auth dá a cada
// aparelho um auth.uid() real, emitido e assinado pelo Supabase, que as
// policies (ver 0011_ministerio_rls_admin.sql) usam pra checar admin de
// verdade. device_key continua existindo em paralelo (é o que já
// identifica "quem é o membro X" nas telas), mas quem autoriza escrita
// agora é o auth_uid vinculado a ele.
let sessaoPromise: Promise<string | null> | null = null;

export function garantirSessaoAnonima(): Promise<string | null> {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  if (!sessaoPromise) {
    sessaoPromise = (async () => {
      const { data: atual } = await supabase.auth.getSession();
      if (atual.session?.user) return atual.session.user.id;

      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        // eslint-disable-next-line no-console
        console.error('Falha ao criar sessão anônima (Supabase Auth):', error);
        sessaoPromise = null; // permite tentar de novo na próxima chamada
        return null;
      }
      return data.user?.id ?? null;
    })();
  }
  return sessaoPromise;
}

/**
 * auth.uid() só se for uma sessão "de verdade" (Google), não anônima —
 * usado pra reconhecer o mesmo membro do Ministério em outro
 * device/navegador. device_key é local (localStorage), então sozinho só
 * identifica "este aparelho"; auth_uid de uma conta Google é o mesmo em
 * qualquer aparelho onde a pessoa logar, então é o que permite achar "meu
 * ministério" numa sessão nova sem precisar do device_key antigo (ver
 * listarMeusMinisterios/buscarMinisterioPorId em ministerioApi.ts).
 *
 * Não cria sessão nenhuma (ao contrário de garantirSessaoAnonima) — só
 * lê o que já existe, porque isto é usado em caminhos de leitura
 * (listagem), não vale a pena forçar uma sessão anônima só pra descobrir
 * que não há nada de "meu" ali.
 */
export async function obterAuthUidReal(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user || user.is_anonymous) return null;
  return user.id;
}
