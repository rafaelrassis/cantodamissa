import { useCallback, useEffect, useState } from 'react';
import { corDeContraste, tomClaro } from './colorUtils';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const ACCENT_KEY = 'accent_color';

function initialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Tema global (claro/escuro + cor de destaque personalizada), persistido
 * em localStorage. Claro/escuro aplica `data-theme` na raiz, onde os
 * tokens de cor em index.css reagem via seletor `:root[data-theme="dark"]`.
 * A cor personalizada sobrescreve --accent/--accent-soft/--accent-fg via
 * style inline na raiz (sempre vence a regra do seletor, então funciona
 * em cima de qualquer tema); null volta pro verde padrão de cada tema.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [corPersonalizada, setCorPersonalizadaState] = useState<string | null>(() =>
    localStorage.getItem(ACCENT_KEY)
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const raiz = document.documentElement.style;
    if (corPersonalizada) {
      raiz.setProperty('--accent', corPersonalizada);
      raiz.setProperty('--accent-soft', tomClaro(corPersonalizada));
      raiz.setProperty('--accent-fg', corDeContraste(corPersonalizada));
    } else {
      raiz.removeProperty('--accent');
      raiz.removeProperty('--accent-soft');
      raiz.removeProperty('--accent-fg');
    }
  }, [corPersonalizada]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const definirCorPersonalizada = useCallback((hex: string | null) => {
    if (hex) localStorage.setItem(ACCENT_KEY, hex);
    else localStorage.removeItem(ACCENT_KEY);
    setCorPersonalizadaState(hex);
  }, []);

  return { theme, toggleTheme, corPersonalizada, definirCorPersonalizada };
}
