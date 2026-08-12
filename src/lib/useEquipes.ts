import { useCallback, useEffect, useState } from 'react';
import * as api from './equipesApi';
import type { Equipe } from '../types/ministerio';

export function useEquipes(ministerioId: string | null) {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!ministerioId) {
      setEquipes([]);
      return;
    }
    setEquipes(await api.listarEquipes(ministerioId));
  }, [ministerioId]);

  useEffect(() => {
    setCarregando(true);
    recarregar().finally(() => setCarregando(false));
  }, [recarregar]);

  const criar = useCallback(
    async (nome: string, membroIds: string[]) => {
      if (!ministerioId) return;
      const nova = await api.criarEquipe(ministerioId, nome, membroIds);
      setEquipes((prev) => [...prev, nova]);
    },
    [ministerioId]
  );

  const editar = useCallback(async (equipeId: string, nome: string, membroIds: string[]) => {
    await api.editarEquipe(equipeId, nome, membroIds);
    setEquipes((prev) => prev.map((e) => (e.id === equipeId ? { id: equipeId, nome, membroIds } : e)));
  }, []);

  const excluir = useCallback(async (equipeId: string) => {
    await api.excluirEquipe(equipeId);
    setEquipes((prev) => prev.filter((e) => e.id !== equipeId));
  }, []);

  return { equipes, carregando, criar, editar, excluir };
}

export type EquipesApi = ReturnType<typeof useEquipes>;
