import { useCallback, useEffect, useState } from 'react';
import * as api from './repertorios';
import type { ItemRepertorio, Repertorio } from './repertorios';

/**
 * Estado reativo dos repertórios do usuário. A camada `repertorios.ts` já
 * decide sozinha se fala com Supabase ou com o fallback local — aqui só
 * envolvemos em estado React e recarregamos após cada mutação.
 */
export function useRepertorios() {
  const [repertorios, setRepertorios] = useState<Repertorio[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    const lista = await api.listarRepertorios();
    setRepertorios(lista);
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const criar = useCallback(
    async (nome: string) => {
      const novo = await api.criarRepertorio(nome);
      await recarregar();
      return novo;
    },
    [recarregar]
  );

  const renomear = useCallback(
    async (id: string, nome: string) => {
      await api.renomearRepertorio(id, nome);
      await recarregar();
    },
    [recarregar]
  );

  const remover = useCallback(
    async (id: string) => {
      await api.removerRepertorio(id);
      await recarregar();
    },
    [recarregar]
  );

  const adicionarMusica = useCallback(
    async (repertorioId: string, item: ItemRepertorio) => {
      await api.adicionarMusica(repertorioId, item);
      await recarregar();
    },
    [recarregar]
  );

  const removerMusica = useCallback(
    async (repertorioId: string, musicaId: string) => {
      await api.removerMusica(repertorioId, musicaId);
      await recarregar();
    },
    [recarregar]
  );

  return {
    repertorios,
    carregando,
    criar,
    renomear,
    remover,
    adicionarMusica,
    removerMusica,
  };
}
