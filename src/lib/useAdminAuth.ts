import { useCallback, useState } from 'react';

const STORAGE_KEY = 'admin_fake_auth';

/**
 * Login fake baseado em localStorage — placeholder até termos OAuth Google
 * real (Fase 2, ver SPEC.md §8.2). Só usado para esconder a tela de
 * moderação de sugestões de acesso público.
 */
export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');

  const login = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsAdmin(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAdmin(false);
  }, []);

  return { isAdmin, login, logout };
}
