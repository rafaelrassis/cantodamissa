import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase, isSupabaseConfigured } from './supabase';

// Precisa bater com o esquema/host registrado no AndroidManifest.xml
// (intent-filter, ver android/app/src/main/AndroidManifest.xml) e
// cadastrado como Redirect URL no Supabase Dashboard. appId vem de
// capacitor.config.ts.
const REDIRECT_NATIVO = 'com.cantodamissa.app://login-callback';

/**
 * Sessão real de usuário via Supabase Auth (Google OAuth) — login único do
 * app. Requer, do lado da configuração:
 *
 * - uma credencial OAuth do tipo "Web application" no Google Cloud
 *   Console, com `https://<projeto>.supabase.co/auth/v1/callback` entre
 *   os Authorized redirect URIs (é o Supabase que fala com o Google, não
 *   o app — por isso não existe credencial "Android" aqui);
 * - Client ID e Secret colados em Authentication > Providers > Google no
 *   dashboard do Supabase;
 * - em Authentication > URL Configuration, os destinos de volta:
 *   o domínio de produção, o localhost do dev e REDIRECT_NATIVO.
 *
 * Dois fluxos diferentes conforme a plataforma:
 *
 * - Web: `signInWithOAuth` navega a própria aba pra fora do app e volta
 *   com o código na URL, que o supabase-js troca por sessão sozinho
 *   (detectSessionInUrl). Por isso não dá pra encadear passos síncronos
 *   depois de chamar `signInWithGoogle` — qualquer coisa que precise
 *   acontecer "depois do login" tem que reagir à sessão aparecendo (ver
 *   App.tsx, prompt de data de nascimento).
 *
 * - Nativo (Android via Capacitor): não existe "voltar pra mesma aba" —
 *   abre o navegador do sistema (Browser.open, mais seguro que WebView
 *   pra login) com `skipBrowserRedirect` pra pegar só a URL do provider
 *   sem navegar embutido, e escuta o deep link de volta (REDIRECT_NATIVO)
 *   via `appUrlOpen`. De lá sai o `code` do PKCE, trocado por sessão em
 *   `exchangeCodeForSession` (ver supabase.ts para por que PKCE).
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

    let removerListenerDeepLink: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      const promessaListener = CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
        if (!url.startsWith(REDIRECT_NATIVO)) return;
        await Browser.close().catch(() => {});

        // PKCE (ver supabase.ts): a volta traz `?code=`, que só vira
        // sessão em conjunto com o code_verifier guardado neste app.
        const query = new URLSearchParams(url.split('?')[1]?.split('#')[0] ?? '');
        const code = query.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.error('Falha ao concluir login Google (nativo):', error);
          return;
        }

        // Fallback pro formato implícito, caso o projeto do Supabase ainda
        // esteja configurado assim.
        const params = new URLSearchParams(url.split('#')[1] ?? '');
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      });
      removerListenerDeepLink = () => {
        promessaListener.then((h) => h.remove());
      };
    }

    return () => {
      assinatura.subscription.unsubscribe();
      removerListenerDeepLink?.();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: REDIRECT_NATIVO, skipBrowserRedirect: true },
      });
      if (error) {
        // eslint-disable-next-line no-console
        console.error('Falha ao iniciar login Google (nativo):', error);
        return;
      }
      if (data.url) await Browser.open({ url: data.url });
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  // O app também abre sessões anônimas do Supabase Auth por baixo dos
  // panos (garantirSessaoAnonima, ver supabaseAuth.ts) só pra dar um
  // auth.uid() real às policies de RLS do Ministério — isso não é
  // "usuário logado" pro resto do app, senão qualquer visitante que
  // nunca clicou em "Entrar com Google" já contaria como logado.
  const user = session?.user && !session.user.is_anonymous ? session.user : null;

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
