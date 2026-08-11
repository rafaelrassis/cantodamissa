import { useCallback, useMemo, useState } from 'react';
import { MEMBROS, CODIGO_CONVITE as CODIGO_CONVITE_PADRAO } from './mockMinisterio';
import type { MembroMinisterio, SolicitacaoIngresso } from '../types/ministerio';

const VOCE_ID = 'm1'; // "você" no mock — na versão real viria do usuário logado

function gerarCodigo(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let sufixo = '';
  for (let i = 0; i < 4; i++) sufixo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return `CDM-${sufixo}`;
}

/**
 * Estado do "meu ministério" — levantado até o App.tsx (em vez de viver só
 * dentro de MinisterioTela) porque o alerta global de solicitação
 * pendente precisa aparecer em qualquer tela do app, mesmo com o módulo
 * Ministério desmontado. Ainda 100% mock (useState em memória).
 */
export function useMinisterioMock() {
  const [pertence, setPertence] = useState(false);
  const [nome, setNome] = useState('Ministério');
  const [foto, setFoto] = useState<string | null>(null); // emoji — upload real fica pra quando tiver Storage ligado
  const [membros, setMembros] = useState<MembroMinisterio[]>(MEMBROS);
  const [codigoConvite, setCodigoConvite] = useState(CODIGO_CONVITE_PADRAO);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoIngresso[]>([]);

  const souAdmin = membros.find((m) => m.id === VOCE_ID)?.admin ?? false;
  const qtdAdmins = useMemo(() => membros.filter((m) => m.admin).length, [membros]);

  const cadastrar = useCallback((nomeNovo: string) => {
    setNome(nomeNovo);
    setFoto(null);
    setMembros([{ ...MEMBROS[0], admin: true }]);
    setCodigoConvite(gerarCodigo());
    // seed de demonstração: alguém "de fora" já pediu pra entrar, pra dar
    // pra testar aprovação + alerta assim que o ministério existe
    setSolicitacoes([{ id: 's1', nome: 'Marina Costa', codigoUsado: '' }]);
    setPertence(true);
  }, []);

  const ingressarComCodigo = useCallback(
    (codigo: string) => codigo.trim().toUpperCase() === codigoConvite,
    [codigoConvite]
  );

  const sair = useCallback(() => setPertence(false), []);

  const excluir = useCallback(() => {
    setPertence(false);
    setMembros(MEMBROS);
    setSolicitacoes([]);
    setNome('Ministério');
    setFoto(null);
    setCodigoConvite(CODIGO_CONVITE_PADRAO);
  }, []);

  const tornarAdmin = useCallback((membroId: string) => {
    setMembros((prev) => prev.map((m) => (m.id === membroId ? { ...m, admin: true } : m)));
  }, []);

  const removerAdmin = useCallback((membroId: string) => {
    setMembros((prev) => prev.map((m) => (m.id === membroId ? { ...m, admin: false } : m)));
  }, []);

  const removerMembro = useCallback((membroId: string) => {
    setMembros((prev) => prev.filter((m) => m.id !== membroId));
  }, []);

  const aprovarSolicitacao = useCallback((s: SolicitacaoIngresso) => {
    setMembros((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, nome: s.nome, avatarCor: 'bg-slate-500', funcoes: [] },
    ]);
    setSolicitacoes((prev) => prev.filter((x) => x.id !== s.id));
  }, []);

  const recusarSolicitacao = useCallback((id: string) => {
    setSolicitacoes((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const regenerarCodigo = useCallback(() => setCodigoConvite(gerarCodigo()), []);

  return {
    pertence,
    nome,
    foto,
    membros,
    codigoConvite,
    solicitacoes,
    souAdmin,
    qtdAdmins,
    cadastrar,
    ingressarComCodigo,
    sair,
    excluir,
    renomear: setNome,
    atualizarFoto: setFoto,
    tornarAdmin,
    removerAdmin,
    removerMembro,
    aprovarSolicitacao,
    recusarSolicitacao,
    regenerarCodigo,
  };
}

export type MinisterioMock = ReturnType<typeof useMinisterioMock>;
