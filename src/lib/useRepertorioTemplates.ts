import { useCallback, useEffect, useState } from 'react';
import * as api from './repertorioTemplatesApi';
import { useCanalErro } from './erroContext';
import type { ItemRepertorio } from './repertorios';
import type { RepertorioTemplate } from './repertorioTemplatesApi';

/** Estado reativo dos templates de repertório de um ministério — mesmo
 * padrão de useAvisos/useEscalas (um hook por tela de Ministério, não
 * precisa de contexto global como repertorios avulsos). */
export function useRepertorioTemplates(ministerioId: string | null) {
  const [templates, setTemplates] = useState<RepertorioTemplate[]>([]);
  const [carregando, setCarregando] = useState(true);
  const { reportar } = useCanalErro();

  const executar = useCallback(
    async (acao: () => Promise<void>) => {
      try {
        await acao();
      } catch (err) {
        reportar(err);
      }
    },
    [reportar]
  );

  const recarregar = useCallback(async () => {
    if (!ministerioId) {
      setTemplates([]);
      return;
    }
    setTemplates(await api.listarTemplates(ministerioId));
  }, [ministerioId]);

  useEffect(() => {
    setCarregando(true);
    recarregar().finally(() => setCarregando(false));
  }, [recarregar]);

  const criar = useCallback(
    async (nome: string) => {
      if (!ministerioId) throw new Error('useRepertorioTemplates.criar: sem ministério');
      const novo = await api.criarTemplate(ministerioId, nome);
      await recarregar();
      return novo;
    },
    [ministerioId, recarregar]
  );

  const remover = useCallback(
    (id: string) =>
      executar(async () => {
        await api.removerTemplate(id);
        await recarregar();
      }),
    [executar, recarregar]
  );

  const adicionarMusica = useCallback(
    (templateId: string, item: ItemRepertorio) =>
      executar(async () => {
        await api.adicionarMusica(templateId, item);
        await recarregar();
      }),
    [executar, recarregar]
  );

  const removerMusica = useCallback(
    (templateId: string, musicaId: string) =>
      executar(async () => {
        await api.removerMusica(templateId, musicaId);
        await recarregar();
      }),
    [executar, recarregar]
  );

  const moverMusicaParaRito = useCallback(
    (templateId: string, musicaId: string, novoRito: string) =>
      executar(async () => {
        await api.moverMusicaParaRito(templateId, musicaId, novoRito);
        await recarregar();
      }),
    [executar, recarregar]
  );

  const adicionarRito = useCallback(
    (templateId: string, nome: string) =>
      executar(async () => {
        await api.adicionarRito(templateId, nome);
        await recarregar();
      }),
    [executar, recarregar]
  );

  const removerRito = useCallback(
    (templateId: string, nome: string) =>
      executar(async () => {
        await api.removerRito(templateId, nome);
        await recarregar();
      }),
    [executar, recarregar]
  );

  const reordenarRitos = useCallback(
    (templateId: string, nomesOrdenados: string[]) =>
      executar(async () => {
        await api.reordenarRitos(templateId, nomesOrdenados);
        await recarregar();
      }),
    [executar, recarregar]
  );

  const aplicarAoRepertorio = useCallback(
    async (templateId: string, repertorioId: string) => {
      await api.aplicarAoRepertorio(templateId, repertorioId);
    },
    []
  );

  return {
    templates,
    carregando,
    criar,
    remover,
    adicionarMusica,
    removerMusica,
    moverMusicaParaRito,
    adicionarRito,
    removerRito,
    reordenarRitos,
    aplicarAoRepertorio,
  };
}

export type RepertorioTemplatesApi = ReturnType<typeof useRepertorioTemplates>;
