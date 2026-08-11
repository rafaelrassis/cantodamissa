import { useCallback, useState } from 'react';

const STORAGE_KEY = 'user_fake_auth_name';
const FOTO_KEY = 'user_fake_auth_foto';
const NASCIMENTO_KEY = 'user_fake_auth_nascimento';

/**
 * Login fake baseado em localStorage — placeholder até termos OAuth Google
 * real (Fase 2, ver SPEC.md §8.2). Usado pro botão "Entrar" do usuário
 * comum na Home; não tem relação com o login de admin (useAdminAuth).
 *
 * `foto` é um emoji (avatar) — upload de imagem real fica pra quando tiver
 * Storage ligado ao perfil do usuário. `dataNascimento` é coletada uma vez
 * na criação da conta (ver UserLoginModal) e persiste mesmo se o usuário
 * deslogar — sair não é "excluir conta" neste mock. É usada como
 * aniversário do integrante "você" no módulo Ministério.
 */
export function useUserAuth() {
  const [userName, setUserName] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [foto, setFotoState] = useState<string | null>(() => localStorage.getItem(FOTO_KEY));
  const [dataNascimento, setDataNascimentoState] = useState<string | null>(() =>
    localStorage.getItem(NASCIMENTO_KEY)
  );

  const login = useCallback((novaDataNascimento?: string) => {
    const nome = 'Você';
    localStorage.setItem(STORAGE_KEY, nome);
    setUserName(nome);
    if (novaDataNascimento) {
      localStorage.setItem(NASCIMENTO_KEY, novaDataNascimento);
      setDataNascimentoState(novaDataNascimento);
    }
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

  const definirDataNascimento = useCallback((iso: string | null) => {
    if (iso) localStorage.setItem(NASCIMENTO_KEY, iso);
    else localStorage.removeItem(NASCIMENTO_KEY);
    setDataNascimentoState(iso);
  }, []);

  return {
    isLoggedIn: userName !== null,
    userName,
    foto,
    dataNascimento,
    login,
    logout,
    definirFoto,
    definirDataNascimento,
  };
}
