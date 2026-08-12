import { useCallback, useEffect, useState } from 'react';
import * as api from './modelosRoteiroApi';
import type { ItemRoteiro, ModeloRoteiro } from '../types/ministerio';

export function useModelosRoteiro(ministerioId: string | null) {
  const [modelos, setModelos] = useState<ModeloRoteiro[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!ministerioId) {
      setModelos([]);
      return;
    }
    setModelos(await api.listarModelosRoteiro(ministerioId));
  }, [ministerioId]);

  useEffect(() => {
    setCarregando(true);
    recarregar().finally(() => setCarregando(false));
  }, [recarregar]);

  const criar = useCallback(
    async (nome: string, itens: ItemRoteiro[]) => {
      if (!ministerioId) return;
      const novo = await api.criarModeloRoteiro(ministerioId, nome, itens);
      setModelos((prev) => [...prev, novo]);
    },
    [ministerioId]
  );

  const excluir = useCallback(async (modeloId: string) => {
    await api.excluirModeloRoteiro(modeloId);
    setModelos((prev) => prev.filter((m) => m.id !== modeloId));
  }, []);

  return { modelos, carregando, criar, excluir };
}

export type ModelosRoteiroApi = ReturnType<typeof useModelosRoteiro>;
