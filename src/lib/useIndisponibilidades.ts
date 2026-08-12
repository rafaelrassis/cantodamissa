import { useCallback, useEffect, useState } from 'react';
import * as api from './indisponibilidadesApi';
import type { Indisponibilidade } from '../types/ministerio';

export function useIndisponibilidades(ministerioId: string | null) {
  const [indisponibilidades, setIndisponibilidades] = useState<Indisponibilidade[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!ministerioId) {
      setIndisponibilidades([]);
      return;
    }
    setIndisponibilidades(await api.listarIndisponibilidades(ministerioId));
  }, [ministerioId]);

  useEffect(() => {
    setCarregando(true);
    recarregar().finally(() => setCarregando(false));
  }, [recarregar]);

  const criar = useCallback(
    async (membroId: string, data: string, motivo: string) => {
      if (!ministerioId) return;
      const nova = await api.criarIndisponibilidade(ministerioId, membroId, data, motivo);
      setIndisponibilidades((prev) => [...prev, nova]);
    },
    [ministerioId]
  );

  return { indisponibilidades, carregando, criar };
}

export type IndisponibilidadesApi = ReturnType<typeof useIndisponibilidades>;
