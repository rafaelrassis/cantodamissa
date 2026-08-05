import { useCallback, useEffect, useState } from 'react';
import * as api from './repertorios';
import type { ItemRepertorio, Repertorio } from './repertorios';

/**
 * Estado reativo dos repertórios do usuário. Persistido em localStorage
 * (ver `repertorios.ts`). Sem sincronização entre abas por enquanto — cada
 * chamada de mutação recarrega a lista inteira do storage.
 */
export function useRepertorios() {
  const [repertorios, setRepertorios] = useState<Repertorio[]>([]);

  const recarregar = useCallback(() => {
    setRepertorios(api.listarRepertorios());
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const criar = useCallback(
    (nome: string) => {
      const novo = api.criarRepertorio(nome);
      recarregar();
      return novo;
    },
    [recarregar]
  );

  const renomear = useCallback(
    (id: string, nome: string) => {
      api.renomearRepertorio(id, nome);
      recarregar();
    },
    [recarregar]
  );

  const remover = useCallback(
    (id: string) => {
      api.removerRepertorio(id);
      recarregar();
    },
    [recarregar]
  );

  const adicionarMusica = useCallback(
    (repertorioId: string, item: ItemRepertorio) => {
      api.adicionarMusica(repertorioId, item);
      recarregar();
    },
    [recarregar]
  );

  const removerMusica = useCallback(
    (repertorioId: string, musicaId: string) => {
      api.removerMusica(repertorioId, musicaId);
      recarregar();
    },
    [recarregar]
  );

  const reordenarMusicas = useCallback(
    (repertorioId: string, musicaIds: string[]) => {
      api.reordenarMusicas(repertorioId, musicaIds);
      recarregar();
    },
    [recarregar]
  );

  return {
    repertorios,
    criar,
    renomear,
    remover,
    adicionarMusica,
    removerMusica,
    reordenarMusicas,
  };
}
