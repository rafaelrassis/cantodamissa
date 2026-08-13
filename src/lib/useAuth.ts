import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Sessão real de usuário via Supabase Auth (Google OAuth) — login único do
 * app. Requer o provider "Google" habilitado no dashboard do Supabase
 * (Authentication > Providers > Google, com Client ID/Secret do Google
 * Cloud Console) e a URL do app cadastrada em "Redirect URLs".
 *
 * Login é via redirect (não popup): `signInWithOAuth` navega pra fora do
 * app e volta com a sessão na URL, que o supabase-js já detecta sozinho
 * (detectSessionInUrl, ligado por padrão no createClient). Por isso não
 * dá pra encadear passos síncronos depois de chamar `signInWithGoogle` —
 * qualquer coisa que precise acontecer "depois do login" tem que reagir
 * à sessão aparecendo (ver App.tsx, prompt de data de nascimento).
 */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCarregando(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCarregando(false);
    });
    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSession(novaSessao);
    });
    return () => assinatura.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  const user = session?.user ?? null;

  return {
    carregando,
    session,
    user,
    email: user?.email ?? null,
    nome: (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? null,
    avatarUrl: (user?.user_metadata?.avatar_url as string | undefined) ?? null,
    signInWithGoogle,
    signOut,
  };
}
