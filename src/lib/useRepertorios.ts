import { useCallback, useEffect, useState } from 'react';
import * as api from './repertorios';
import { mensagemDeErro } from './supabaseUtils';
import type { ItemRepertorio, Repertorio } from './repertorios';

/**
 * Estado reativo dos repertórios do usuário. A camada `repertorios.ts` já
 * decide sozinha se fala com Supabase ou com o fallback local — aqui só
 * envolvemos em estado React e recarregamos após cada mutação.
 *
 * Não use direto: o app inteiro compartilha uma instância via
 * RepertoriosProvider (ver repertoriosContext.tsx). Com um hook por tela,
 * cada uma buscava a lista inteira no mount e a mutação feita numa não
 * aparecia na outra — adicionar música pelo leitor não atualizava a
 * sidebar da Home até o próximo remount.
 */
export function useRepertoriosEstado() {
  const [repertorios, setRepertorios] = useState<Repertorio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  /** Mesma ideia de useMinisterio.executar: falha vira mensagem na tela. */
  const executar = useCallback(async (acao: () => Promise<void>) => {
    setErroAcao(null);
    try {
      await acao();
    } catch (err) {
      setErroAcao(mensagemDeErro(err));
    }
  }, []);

  const limparErroAcao = useCallback(() => setErroAcao(null), []);

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
    (id: string, nome: string) =>
      executar(async () => {
        await api.renomearRepertorio(id, nome);
        await recarregar();
      }),
    [executar, recarregar]
  );

  const remover = useCallback(
    (id: string) =>
      executar(async () => {
        await api.removerRepertorio(id);
        await recarregar();
      }),
    [executar, recarregar]
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
    (repertorioId: string, item: ItemRepertorio) =>
      executar(async () => {
        await api.adicionarMusica(repertorioId, item);
        await recarregar();
      }),
    [executar, recarregar]
  );

  const removerMusica = useCallback(
    (repertorioId: string, musicaId: string) =>
      executar(async () => {
        await api.removerMusica(repertorioId, musicaId);
        await recarregar();
      }),
    [executar, recarregar]
  );

  const moverMusicaParaRito = useCallback(
    (repertorioId: string, musicaId: string, novoRito: string) =>
      executar(async () => {
        await api.moverMusicaParaRito(repertorioId, musicaId, novoRito);
        await recarregar();
      }),
    [executar, recarregar]
  );

  const adicionarRito = useCallback(
    (repertorioId: string, nome: string) =>
      executar(async () => {
        await api.adicionarRito(repertorioId, nome);
        await recarregar();
      }),
    [executar, recarregar]
  );

  const removerRito = useCallback(
    (repertorioId: string, nome: string) =>
      executar(async () => {
        await api.removerRito(repertorioId, nome);
        await recarregar();
      }),
    [executar, recarregar]
  );

  const reordenarRitos = useCallback(
    (repertorioId: string, nomesOrdenados: string[]) =>
      executar(async () => {
        await api.reordenarRitos(repertorioId, nomesOrdenados);
        await recarregar();
      }),
    [executar, recarregar]
  );

  return {
    repertorios,
    carregando,
    erroAcao,
    limparErroAcao,
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

export type RepertoriosApi = ReturnType<typeof useRepertoriosEstado>;
