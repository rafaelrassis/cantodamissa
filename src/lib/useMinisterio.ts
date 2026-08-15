import { useCallback, useEffect, useState } from 'react';
import * as api from './ministerioApi';
import { useCanalErro } from './erroContext';
import type { MinisterioIdentidade, MinisterioResumo } from './ministerioApi';
import type { SolicitacaoIngresso } from '../types/ministerio';

const CHAVE_MINISTERIO_ATIVO = 'cdm_ministerio_ativo_id';

/** Dados da conta usados ao entrar num ministério (nome e aniversário do perfil). */
export type PerfilUsuario = {
  nome?: string | null;
  dataNascimento?: string | null;
};

/**
 * Hook real do módulo Ministério (Supabase) — mesma interface antes usada
 * pelo protótipo mockado (pra não quebrar Home.tsx/MinisterioTela.tsx),
 * agora lendo/gravando no Supabase via ministerioApi.ts. "Eu" é o
 * auth.uid() da sessão (ver ministerioApi.ts).
 *
 * `recarregar` refaz a busca completa após qualquer mutação — schema é
 * pequeno o bastante pra isso ser simples e sempre consistente; otimizar
 * pra updates otimistas fica pra quando o módulo estiver validado.
 */
export function useMinisterio(perfil: PerfilUsuario = {}) {
  const { nome: nomeUsuario, dataNascimento: dataNascimentoUsuario } = perfil;
  const [ministerio, setMinisterio] = useState<MinisterioIdentidade | null>(null);
  const [meusMinisterios, setMeusMinisterios] = useState<MinisterioResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const { reportar } = useCanalErro();

  /**
   * Envolve uma mutação para que a falha vire mensagem na tela em vez de
   * promise rejeitada no console. Passou a ser necessário quando a camada
   * de dados deixou de engolir erro de permissão: com RLS restrita, o
   * "não pode" é um resultado normal (ex.: alguém deixou de ser admin
   * enquanto a tela estava aberta) e o usuário precisa saber por que nada
   * mudou.
   */
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
      const m = await api.criarMinisterio(
        nomeNovo,
        dataNascimentoUsuario,
        funcoesCustom,
        nomeUsuario
      );
      await recarregar(m.id);
    },
    [dataNascimentoUsuario, nomeUsuario, recarregar]
  );

  // O nome vem da conta Google. Antes ia fixo como "Novo integrante", o
  // que deixava o admin aprovando (ou recusando) pedidos sem saber de
  // quem eram — e o membro entrava com esse nome na equipe.
  const ingressarComCodigo = useCallback(
    async (codigo: string) => api.solicitarIngresso(codigo, nomeUsuario?.trim() || 'Novo integrante'),
    [nomeUsuario]
  );

  const sair = useCallback(
    () =>
      executar(async () => {
        if (!ministerio) return;
        await api.sairDoMinisterio(ministerio.id);
        await recarregar();
      }),
    [executar, ministerio, recarregar]
  );

  const excluir = useCallback(
    () =>
      executar(async () => {
        if (!ministerio) return;
        await api.excluirMinisterio(ministerio.id);
        await recarregar();
      }),
    [executar, ministerio, recarregar]
  );

  const renomear = useCallback(
    (novoNome: string) =>
      executar(async () => {
        if (!ministerio) return;
        await api.renomearMinisterio(ministerio.id, novoNome);
        setMinisterio((prev) => (prev ? { ...prev, nome: novoNome } : prev));
      }),
    [executar, ministerio]
  );

  // Upload real fica pra quando tiver Storage ligado ao ministério — por
  // ora não persiste (mantido só pra não quebrar a tela de Configurações).
  const atualizarFoto = useCallback((_emoji: string | null) => {}, []);

  const tornarAdmin = useCallback(
    (membroId: string) =>
      executar(async () => {
        await api.definirAdmin(membroId, true);
        await recarregar();
      }),
    [executar, recarregar]
  );

  const removerAdmin = useCallback(
    (membroId: string) =>
      executar(async () => {
        await api.definirAdmin(membroId, false);
        await recarregar();
      }),
    [executar, recarregar]
  );

  const removerMembro = useCallback(
    (membroId: string) =>
      executar(async () => {
        await api.removerMembro(membroId);
        await recarregar();
      }),
    [executar, recarregar]
  );

  const aprovarSolicitacao = useCallback(
    (s: SolicitacaoIngresso) =>
      executar(async () => {
        if (!ministerio) return;
        await api.aprovarSolicitacao(ministerio.id, s);
        await recarregar();
      }),
    [executar, ministerio, recarregar]
  );

  const recusarSolicitacao = useCallback(
    (id: string) =>
      executar(async () => {
        await api.recusarSolicitacao(id);
        await recarregar();
      }),
    [executar, recarregar]
  );

  const regenerarCodigo = useCallback(
    () =>
      executar(async () => {
        if (!ministerio) return;
        const codigo = await api.regenerarCodigoConvite(ministerio.id);
        setMinisterio((prev) => (prev ? { ...prev, codigoConvite: codigo } : prev));
      }),
    [executar, ministerio]
  );

  const criarFuncao = useCallback(
    (nome: string, icone: string) =>
      executar(async () => {
        if (!ministerio) return;
        await api.criarFuncao(ministerio.id, nome, icone);
        await recarregar();
      }),
    [executar, ministerio, recarregar]
  );

  const editarFuncao = useCallback(
    (funcaoId: string, nome: string, icone: string) =>
      executar(async () => {
        await api.editarFuncao(funcaoId, nome, icone);
        await recarregar();
      }),
    [executar, recarregar]
  );

  const removerFuncao = useCallback(
    (funcaoId: string) =>
      executar(async () => {
        await api.removerFuncao(funcaoId);
        await recarregar();
      }),
    [executar, recarregar]
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
