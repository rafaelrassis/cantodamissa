import { useCallback, useEffect, useState } from 'react';
import * as api from './avisosApi';
import { preservarSeIgual, useRevalidarEmFoco } from './useRevalidarEmFoco';
import type { Aviso } from '../types/ministerio';

export function useAvisos(ministerioId: string | null) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!ministerioId) {
      setAvisos([]);
      return;
    }
    const lista = await api.listarAvisos(ministerioId);
    setAvisos((prev) => preservarSeIgual(prev, lista));
  }, [ministerioId]);

  useEffect(() => {
    setCarregando(true);
    recarregar().finally(() => setCarregando(false));
  }, [recarregar]);

  // Aviso publicado por outro admin aparece sem precisar fechar o app
  // (ver useRevalidarEmFoco).
  useRevalidarEmFoco(recarregar);

  const criar = useCallback(
    async (titulo: string, descricao: string, emDestaque: boolean) => {
      if (!ministerioId) return;
      const novo = await api.criarAviso(ministerioId, titulo, descricao, emDestaque);
      setAvisos((prev) => [novo, ...prev]);
    },
    [ministerioId]
  );

  const arquivar = useCallback(async (avisoId: string) => {
    await api.arquivarAviso(avisoId);
    setAvisos((prev) => prev.map((a) => (a.id === avisoId ? { ...a, arquivado: true } : a)));
  }, []);

  return { avisos, carregando, criar, arquivar };
}

export type AvisosApi = ReturnType<typeof useAvisos>;
