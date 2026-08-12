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
    async (nome: string, escalaId: string | null = null) => {
      const novo = await api.criarRepertorio(nome, escalaId);
      await recarregar();
      return novo;
    },
    [recarregar]
  );

  /** Repertório já vinculado a uma escala, se existir — busca na lista em
   * memória primeiro (evita ida ao servidor pra um dado que já temos). */
  const obterPorEscala = useCallback(
    (escalaId: string) => repertorios.find((r) => r.escalaId === escalaId) ?? null,
    [repertorios]
  );

  /** Garante que a escala tem um repertório vinculado — usa o existente ou
   * cria um na hora (nome = título da escala). 1 escala = 1 repertório. */
  const garantirRepertorioDaEscala = useCallback(
    async (escalaId: string, nomeEscala: string) => {
      const existente = repertorios.find((r) => r.escalaId === escalaId);
      if (existente) return existente;
      const doServidor = await api.obterRepertorioPorEscala(escalaId);
      if (doServidor) {
        await recarregar();
        return doServidor;
      }
      return criar(nomeEscala, escalaId);
    },
    [repertorios, criar, recarregar]
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

  const duplicar = useCallback(
    async (id: string) => {
      const copia = await api.duplicarRepertorio(id);
      await recarregar();
      return copia;
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

  const moverMusicaParaRito = useCallback(
    async (repertorioId: string, musicaId: string, novoRito: string) => {
      await api.moverMusicaParaRito(repertorioId, musicaId, novoRito);
      await recarregar();
    },
    [recarregar]
  );

  const adicionarRito = useCallback(
    async (repertorioId: string, nome: string) => {
      await api.adicionarRito(repertorioId, nome);
      await recarregar();
    },
    [recarregar]
  );

  const removerRito = useCallback(
    async (repertorioId: string, nome: string) => {
      await api.removerRito(repertorioId, nome);
      await recarregar();
    },
    [recarregar]
  );

  const reordenarRitos = useCallback(
    async (repertorioId: string, nomesOrdenados: string[]) => {
      await api.reordenarRitos(repertorioId, nomesOrdenados);
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
    duplicar,
    obterPorEscala,
    garantirRepertorioDaEscala,
    adicionarMusica,
    removerMusica,
    moverMusicaParaRito,
    adicionarRito,
    removerRito,
    reordenarRitos,
  };
}

export type RepertoriosApi = ReturnType<typeof useRepertorios>;
