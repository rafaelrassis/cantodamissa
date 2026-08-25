import { useCallback, useEffect, useState } from 'react';
import * as api from './solicitacoesRemocao';
import type {
  DadosSolicitacaoRemocao,
  SolicitacaoRemocao,
  StatusSolicitacaoRemocao,
} from './solicitacoesRemocao';

/** Estado reativo dos pedidos de remoção — mesmo padrão de useSubmissoes.ts. */
export function useSolicitacoesRemocao() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoRemocao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    const lista = await api.listarSolicitacoesRemocao();
    setSolicitacoes(lista);
    setCarregando(false);
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const criar = useCallback(async (dados: DadosSolicitacaoRemocao) => {
    return api.criarSolicitacaoRemocao(dados);
  }, []);

  const atualizarStatus = useCallback(
    async (id: string, status: StatusSolicitacaoRemocao, respostaAdmin?: string) => {
      await api.atualizarStatusSolicitacaoRemocao(id, status, respostaAdmin);
      await recarregar();
    },
    [recarregar]
  );

  return { solicitacoes, carregando, criar, atualizarStatus, recarregar };
}
