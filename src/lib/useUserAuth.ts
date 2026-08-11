import { useCallback, useState } from 'react';

const STORAGE_KEY = 'user_fake_auth_name';
const FOTO_KEY = 'user_fake_auth_foto';

/**
 * Login fake baseado em localStorage — placeholder até termos OAuth Google
 * real (Fase 2, ver SPEC.md §8.2). Usado pro botão "Entrar" do usuário
 * comum na Home; não tem relação com o login de admin (useAdminAuth).
 * `foto` é um emoji (avatar) — upload de imagem real fica pra quando tiver
 * Storage ligado ao perfil do usuário.
 */
export function useUserAuth() {
  const [userName, setUserName] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [foto, setFotoState] = useState<string | null>(() => localStorage.getItem(FOTO_KEY));

  const login = useCallback(() => {
    const nome = 'Você';
    localStorage.setItem(STORAGE_KEY, nome);
    setUserName(nome);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUserName(null);
  }, []);

  const definirFoto = useCallback((emoji: string | null) => {
    if (emoji) localStorage.setItem(FOTO_KEY, emoji);
    else localStorage.removeItem(FOTO_KEY);
    setFotoState(emoji);
  }, []);

  return { isLoggedIn: userName !== null, userName, foto, login, logout, definirFoto };
}
