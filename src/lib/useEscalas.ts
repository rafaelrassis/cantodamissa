import { useCallback, useEffect, useState } from 'react';
import * as api from './escalasApi';
import type { Escala } from '../types/ministerio';

/**
 * Escalas do ministério ativo. `ministerioId` null (ainda carregando
 * identidade, ou usuário não pertence a nenhum) resulta em lista vazia,
 * sem chamar a API.
 */
export function useEscalas(ministerioId: string | null) {
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!ministerioId) {
      setEscalas([]);
      return;
    }
    const lista = await api.listarEscalas(ministerioId);
    setEscalas(lista);
  }, [ministerioId]);

  useEffect(() => {
    setCarregando(true);
    recarregar().finally(() => setCarregando(false));
  }, [recarregar]);

  const criar = useCallback(
    async (rascunho: Escala) => {
      if (!ministerioId) throw new Error('Nenhum ministério ativo.');
      const nova = await api.criarEscala(ministerioId, rascunho);
      setEscalas((prev) => [...prev, nova]);
      return nova;
    },
    [ministerioId]
  );

  const atualizar = useCallback(async (escala: Escala) => {
    await api.atualizarEscala(escala);
    setEscalas((prev) => prev.map((e) => (e.id === escala.id ? escala : e)));
  }, []);

  const excluir = useCallback(async (escalaId: string) => {
    await api.excluirEscala(escalaId);
    setEscalas((prev) => prev.filter((e) => e.id !== escalaId));
  }, []);

  return { escalas, carregando, criar, atualizar, excluir, recarregar };
}

export type EscalasApi = ReturnType<typeof useEscalas>;
