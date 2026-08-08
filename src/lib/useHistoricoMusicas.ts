import { useCallback, useState } from 'react';

const KEY = 'cdm_historico_musicas';
const MAX = 10;

export interface ItemHistorico {
  id: string;
  slug: string;
  title: string;
  artist: string | null;
}

function ler(): ItemHistorico[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Histórico das últimas músicas abertas (localStorage, só client-side).
 * `registrarAbertura` deve ser chamado de dentro do CifraReader sempre que
 * uma música é aberta — sem isso o histórico fica sempre vazio.
 */
export function useHistoricoMusicas() {
  const [historico, setHistorico] = useState<ItemHistorico[]>(() => ler());

  const registrarAbertura = useCallback((item: ItemHistorico) => {
    setHistorico((atual) => {
      const semDuplicata = atual.filter((h) => h.id !== item.id);
      const novo = [item, ...semDuplicata].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(novo));
      return novo;
    });
  }, []);

  const remover = useCallback((id: string) => {
    setHistorico((atual) => {
      const novo = atual.filter((h) => h.id !== id);
      localStorage.setItem(KEY, JSON.stringify(novo));
      return novo;
    });
  }, []);

  const limpar = useCallback(() => {
    localStorage.setItem(KEY, JSON.stringify([]));
    setHistorico([]);
  }, []);

  return { historico, registrarAbertura, remover, limpar };
}
