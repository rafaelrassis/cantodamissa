import { useCallback, useState } from 'react';

const STORAGE_KEY = 'user_fake_auth_name';

/**
 * Login fake baseado em localStorage — placeholder até termos OAuth Google
 * real (Fase 2, ver SPEC.md §8.2). Usado pro botão "Entrar" do usuário
 * comum na Home; não tem relação com o login de admin (useAdminAuth).
 */
export function useUserAuth() {
  const [userName, setUserName] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));

  const login = useCallback(() => {
    const nome = 'Você';
    localStorage.setItem(STORAGE_KEY, nome);
    setUserName(nome);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUserName(null);
  }, []);

  return { isLoggedIn: userName !== null, userName, login, logout };
}
