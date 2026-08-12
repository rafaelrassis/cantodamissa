import { useCallback, useEffect, useState } from 'react';
import * as api from './ministerioApi';
import type { MinisterioIdentidade, MinisterioResumo } from './ministerioApi';
import type { SolicitacaoIngresso } from '../types/ministerio';

const CHAVE_MINISTERIO_ATIVO = 'cdm_ministerio_ativo_id';

/**
 * Hook real do módulo Ministério (Supabase) — mesma interface antes usada
 * pelo protótipo mockado (pra não
 * quebrar Home.tsx/MinisterioTela.tsx), agora lendo/gravando no Supabase
 * via ministerioApi.ts. Sem auth ainda: "eu" é identificado por
 * device_key (ver getDeviceKey em repertorios.ts).
 *
 * `recarregar` refaz a busca completa após qualquer mutação — schema é
 * pequeno o bastante pra isso ser simples e sempre consistente; otimizar
 * pra updates otimistas fica pra quando o módulo estiver validado.
 */
export function useMinisterio(dataNascimentoUsuario?: string | null) {
  const [ministerio, setMinisterio] = useState<MinisterioIdentidade | null>(null);
  const [meusMinisterios, setMeusMinisterios] = useState<MinisterioResumo[]>([]);
  const [carregando, setCarregando] = useState(true);

  /**
   * Refaz a lista de ministérios do device e recarrega o ministério ativo
   * (o salvo em localStorage, se ainda válido; senão o primeiro da lista).
   * `preferirId` força a troca pra um id específico (usado após
   * cadastrar/trocar).
   */
  const recarregar = useCallback(async (preferirId?: string) => {
    const lista = await api.listarMeusMinisterios();
    setMeusMinisterios(lista);

    if (lista.length === 0) {
      localStorage.removeItem(CHAVE_MINISTERIO_ATIVO);
      setMinisterio(null);
      return null;
    }

    const salvo = preferirId ?? localStorage.getItem(CHAVE_MINISTERIO_ATIVO);
    const alvoId = lista.find((m) => m.id === salvo)?.id ?? lista[0].id;
    localStorage.setItem(CHAVE_MINISTERIO_ATIVO, alvoId);

    const m = await api.buscarMinisterioPorId(alvoId);
    setMinisterio(m);
    return m;
  }, []);

  useEffect(() => {
    setCarregando(true);
    recarregar().finally(() => setCarregando(false));
  }, [recarregar]);

  /** Troca qual ministério (dentre os que o device já integra) está ativo. */
  const trocarMinisterio = useCallback(async (ministerioId: string) => {
    setCarregando(true);
    try {
      localStorage.setItem(CHAVE_MINISTERIO_ATIVO, ministerioId);
      const m = await api.buscarMinisterioPorId(ministerioId);
      setMinisterio(m);
    } finally {
      setCarregando(false);
    }
  }, []);

  const podeAdicionarMinisterio = meusMinisterios.length < api.LIMITE_MINISTERIOS;

  const pertence = ministerio !== null;
  const id = ministerio?.id ?? null;
  const meuMembroId = ministerio?.meuMembroId ?? null;
  const nome = ministerio?.nome ?? 'Ministério';
  const foto = ministerio?.foto ?? null;
  const membros = ministerio?.membros ?? [];
  const funcoes = ministerio?.funcoes ?? [];
  const codigoConvite = ministerio?.codigoConvite ?? '';
  const solicitacoes = ministerio?.solicitacoes ?? [];
  const souAdmin = membros.find((m) => m.id === meuMembroId)?.admin ?? false;
  const qtdAdmins = membros.filter((m) => m.admin).length;

  const cadastrar = useCallback(
    async (nomeNovo: string, funcoesCustom?: { nome: string; icone: string }[]) => {
      const m = await api.criarMinisterio(nomeNovo, dataNascimentoUsuario, funcoesCustom);
      await recarregar(m.id);
    },
    [dataNascimentoUsuario, recarregar]
  );

  const ingressarComCodigo = useCallback(async (codigo: string) => {
    // "Você" como nome do solicitante até termos auth de verdade (nome da conta).
    return api.solicitarIngresso(codigo, 'Novo integrante');
  }, []);

  const sair = useCallback(async () => {
    if (!ministerio) return;
    await api.sairDoMinisterio(ministerio.id);
    await recarregar();
  }, [ministerio, recarregar]);

  const excluir = useCallback(async () => {
    if (!ministerio) return;
    await api.excluirMinisterio(ministerio.id);
    await recarregar();
  }, [ministerio, recarregar]);

  const renomear = useCallback(
    async (novoNome: string) => {
      if (!ministerio) return;
      await api.renomearMinisterio(ministerio.id, novoNome);
      setMinisterio((prev) => (prev ? { ...prev, nome: novoNome } : prev));
    },
    [ministerio]
  );

  // Upload real fica pra quando tiver Storage ligado ao ministério — por
  // ora não persiste (mantido só pra não quebrar a tela de Configurações).
  const atualizarFoto = useCallback((_emoji: string | null) => {}, []);

  const tornarAdmin = useCallback(
    async (membroId: string) => {
      await api.definirAdmin(membroId, true);
      await recarregar();
    },
    [recarregar]
  );

  const removerAdmin = useCallback(
    async (membroId: string) => {
      await api.definirAdmin(membroId, false);
      await recarregar();
    },
    [recarregar]
  );

  const removerMembro = useCallback(
    async (membroId: string) => {
      await api.removerMembro(membroId);
      await recarregar();
    },
    [recarregar]
  );

  const aprovarSolicitacao = useCallback(
    async (s: SolicitacaoIngresso) => {
      if (!ministerio) return;
      await api.aprovarSolicitacao(ministerio.id, s);
      await recarregar();
    },
    [ministerio, recarregar]
  );

  const recusarSolicitacao = useCallback(
    async (id: string) => {
      await api.recusarSolicitacao(id);
      await recarregar();
    },
    [recarregar]
  );

  const regenerarCodigo = useCallback(async () => {
    if (!ministerio) return;
    const codigo = await api.regenerarCodigoConvite(ministerio.id);
    setMinisterio((prev) => (prev ? { ...prev, codigoConvite: codigo } : prev));
  }, [ministerio]);

  const criarFuncao = useCallback(
    async (nome: string, icone: string) => {
      if (!ministerio) return;
      await api.criarFuncao(ministerio.id, nome, icone);
      await recarregar();
    },
    [ministerio, recarregar]
  );

  const editarFuncao = useCallback(
    async (funcaoId: string, nome: string, icone: string) => {
      await api.editarFuncao(funcaoId, nome, icone);
      await recarregar();
    },
    [recarregar]
  );

  const removerFuncao = useCallback(
    async (funcaoId: string) => {
      await api.removerFuncao(funcaoId);
      await recarregar();
    },
    [recarregar]
  );

  return {
    carregando,
    pertence,
    meusMinisterios,
    trocarMinisterio,
    podeAdicionarMinisterio,
    id,
    meuMembroId,
    nome,
    foto,
    membros,
    funcoes,
    codigoConvite,
    solicitacoes,
    souAdmin,
    qtdAdmins,
    cadastrar,
    ingressarComCodigo,
    sair,
    excluir,
    renomear,
    atualizarFoto,
    tornarAdmin,
    removerAdmin,
    removerMembro,
    aprovarSolicitacao,
    recusarSolicitacao,
    regenerarCodigo,
    criarFuncao,
    editarFuncao,
    removerFuncao,
  };
}

export type Ministerio = ReturnType<typeof useMinisterio>;
