import { useCallback, useEffect, useState } from 'react';
import * as api from './submissoes';
import type { Submissao, StatusSubmissao } from './submissoes';

export function useSubmissoes() {
  const [submissoes, setSubmissoes] = useState<Submissao[]>([]);

  const recarregar = useCallback(() => {
    setSubmissoes(api.listarSubmissoes());
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const criar = useCallback(
    (dados: Parameters<typeof api.criarSubmissao>[0]) => {
      const nova = api.criarSubmissao(dados);
      recarregar();
      return nova;
    },
    [recarregar]
  );

  const atualizarStatus = useCallback(
    (id: string, status: StatusSubmissao) => {
      api.atualizarStatus(id, status);
      recarregar();
    },
    [recarregar]
  );

  const remover = useCallback(
    (id: string) => {
      api.removerSubmissao(id);
      recarregar();
    },
    [recarregar]
  );

  return { submissoes, criar, atualizarStatus, remover };
}
