import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase, isSupabaseConfigured } from './supabase';

const FOTO_KEY_PREFIX = 'user_foto_emoji_'; // fallback local (sem Supabase), sufixo = user.id
const NASCIMENTO_KEY_PREFIX = 'user_nascimento_'; // idem

/**
 * Login real do usuário (Google, via useAuth/Supabase Auth) — substitui o
 * antigo login fake em localStorage. Mantém a mesma interface externa
 * (isLoggedIn, userName, foto, dataNascimento, login, logout,
 * definirFoto, definirDataNascimento) pra não quebrar App.tsx/Home.tsx.
 *
 * `foto` (emoji-avatar) e `dataNascimento` vivem em `public.perfis_usuario`
 * (ver 0030_perfis_usuario.sql), 1:1 com auth.uid() — antes ficavam só em
 * localStorage namespaced por user.id, o que perdia o dado ao trocar de
 * aparelho ou limpar o navegador. Fallback local só quando o Supabase não
 * está configurado (mesmo padrão de submissoes.ts/repertorios.ts).
 */
export function useUserAuth() {
  const { user, email, nome, carregando, signInWithGoogle, signOut } = useAuth();

  const [foto, setFotoState] = useState<string | null>(null);
  const [dataNascimento, setDataNascimentoState] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setFotoState(null);
      setDataNascimentoState(null);
      return;
    }

    if (!isSupabaseConfigured) {
      setFotoState(localStorage.getItem(FOTO_KEY_PREFIX + user.id));
      setDataNascimentoState(localStorage.getItem(NASCIMENTO_KEY_PREFIX + user.id));
      return;
    }

    let cancelado = false;
    supabase
      .from('perfis_usuario')
      .select('foto_emoji, data_nascimento')
      .eq('auth_uid', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error) {
          console.error('perfis_usuario (carregar):', error.message);
          return;
        }
        setFotoState(data?.foto_emoji ?? null);
        setDataNascimentoState(data?.data_nascimento ?? null);
      });
    return () => {
      cancelado = true;
    };
  }, [user]);

  const login = useCallback(async () => {
    await signInWithGoogle();
  }, [signInWithGoogle]);

  const logout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const salvarPerfil = useCallback(
    async (campo: 'foto_emoji' | 'data_nascimento', valor: string | null) => {
      if (!user) return;
      const { error } = await supabase
        .from('perfis_usuario')
        .upsert({ auth_uid: user.id, [campo]: valor }, { onConflict: 'auth_uid' });
      if (error) console.error(`perfis_usuario (salvar ${campo}):`, error.message);
    },
    [user]
  );

  const definirFoto = useCallback(
    (emoji: string | null) => {
      if (!user) return;
      setFotoState(emoji);
      if (!isSupabaseConfigured) {
        if (emoji) localStorage.setItem(FOTO_KEY_PREFIX + user.id, emoji);
        else localStorage.removeItem(FOTO_KEY_PREFIX + user.id);
        return;
      }
      void salvarPerfil('foto_emoji', emoji);
    },
    [user, salvarPerfil]
  );

  const definirDataNascimento = useCallback(
    (iso: string | null) => {
      if (!user) return;
      setDataNascimentoState(iso);
      if (!isSupabaseConfigured) {
        if (iso) localStorage.setItem(NASCIMENTO_KEY_PREFIX + user.id, iso);
        else localStorage.removeItem(NASCIMENTO_KEY_PREFIX + user.id);
        return;
      }
      void salvarPerfil('data_nascimento', iso);
    },
    [user, salvarPerfil]
  );

  return {
    isLoggedIn: user !== null,
    carregandoAuth: carregando,
    userName: nome,
    userEmail: email,
    foto,
    dataNascimento,
    login,
    logout,
    definirFoto,
    definirDataNascimento,
  };
}
