import { useCallback, useEffect, useState } from 'react';
import * as api from './submissoes';
import type { DadosSubmissao, StatusSubmissao, Submissao } from './submissoes';

/**
 * Estado reativo das submissões. Virou assíncrono junto com a camada de
 * dados (antes era localStorage síncrono, ver submissoes.ts).
 */
export function useSubmissoes() {
  const [submissoes, setSubmissoes] = useState<Submissao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    const lista = await api.listarSubmissoes();
    setSubmissoes(lista);
    setCarregando(false);
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const criar = useCallback(
    async (dados: DadosSubmissao) => {
      const nova = await api.criarSubmissao(dados);
      await recarregar();
      return nova;
    },
    [recarregar]
  );

  const atualizarStatus = useCallback(
    async (id: string, status: StatusSubmissao) => {
      await api.atualizarStatus(id, status);
      await recarregar();
    },
    [recarregar]
  );

  const remover = useCallback(
    async (id: string) => {
      await api.removerSubmissao(id);
      await recarregar();
    },
    [recarregar]
  );

  return { submissoes, carregando, criar, atualizarStatus, remover };
}
