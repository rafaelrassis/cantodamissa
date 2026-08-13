import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';

const FOTO_KEY_PREFIX = 'user_foto_emoji_'; // sufixo = user.id, emoji é por conta
const NASCIMENTO_KEY_PREFIX = 'user_nascimento_'; // idem

/**
 * Login real do usuário (Google, via useAuth/Supabase Auth) — substitui o
 * antigo login fake em localStorage. Mantém a mesma interface externa
 * (isLoggedIn, userName, foto, dataNascimento, login, logout,
 * definirFoto, definirDataNascimento) pra não quebrar App.tsx/Home.tsx.
 *
 * `foto` aqui é o emoji-avatar opcional que o usuário escolhe em
 * "Personalizar" (independente da foto real do Google) — mantém o
 * comportamento anterior. `dataNascimento` ainda vive em localStorage,
 * agora namespaced por user.id em vez de global: é um dado por conta, mas
 * threading isso pro Supabase (tabela de perfil) fica pra depois — anotado
 * como pendência, não bloqueia o login real.
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
    setFotoState(localStorage.getItem(FOTO_KEY_PREFIX + user.id));
    setDataNascimentoState(localStorage.getItem(NASCIMENTO_KEY_PREFIX + user.id));
  }, [user]);

  const login = useCallback(async () => {
    await signInWithGoogle();
  }, [signInWithGoogle]);

  const logout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const definirFoto = useCallback(
    (emoji: string | null) => {
      if (!user) return;
      if (emoji) localStorage.setItem(FOTO_KEY_PREFIX + user.id, emoji);
      else localStorage.removeItem(FOTO_KEY_PREFIX + user.id);
      setFotoState(emoji);
    },
    [user]
  );

  const definirDataNascimento = useCallback(
    (iso: string | null) => {
      if (!user) return;
      if (iso) localStorage.setItem(NASCIMENTO_KEY_PREFIX + user.id, iso);
      else localStorage.removeItem(NASCIMENTO_KEY_PREFIX + user.id);
      setDataNascimentoState(iso);
    },
    [user]
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
