// Camada de dados real do Ministério (Supabase).
//
// Quem é "eu" aqui é o auth.uid() da sessão do Supabase (anônima por
// dispositivo, ou a conta Google quando a pessoa entra) — é o único
// identificador que as policies de RLS conseguem verificar, porque vem
// assinado no JWT. A device_key continua na tabela só como ponte pras
// linhas criadas antes disso existir (ver vincularMembroLegado).
//
// Os fluxos que precisam enxergar além do que a sessão pode (fundar um
// ministério, pedir ingresso por código, aprovar alguém) passam por RPCs
// security definer, que validam a regra dentro do banco — ver
// supabase/migrations/0013_ministerio_rls_por_membro.sql.

import { supabase, isSupabaseConfigured } from './supabase';
import { getDeviceKey } from './repertorios';
import { garantirSessaoAnonima } from './supabaseAuth';
import { exigirLinha, exigirLinhas } from './supabaseUtils';
import type { FuncaoMinisterio, MembroMinisterio, SolicitacaoIngresso } from '../types/ministerio';

export const FUNCOES_PADRAO: Omit<FuncaoMinisterio, 'id'>[] = [
  { nome: 'Ministro', icone: '🎤' },
  { nome: 'Vocalista', icone: '🎙️' },
  { nome: 'Backing vocal', icone: '🎶' },
  { nome: 'Baixo', icone: '🎸' },
  { nome: 'Violão', icone: '🪕' },
  { nome: 'Teclado', icone: '🎹' },
  { nome: 'Guitarra', icone: '🎸' },
  { nome: 'Piano', icone: '🎹' },
  { nome: 'Bateria', icone: '🥁' },
  { nome: 'Percussão', icone: '🪘' },
  { nome: 'Mesa de som', icone: '🎚️' },
];

export type MinisterioIdentidade = {
  id: string;
  nome: string;
  foto: string | null;
  codigoConvite: string;
  membros: MembroMinisterio[];
  funcoes: FuncaoMinisterio[];
  solicitacoes: SolicitacaoIngresso[];
  meuMembroId: string | null;
};

export type MinisterioResumo = {
  id: string;
  nome: string;
  foto: string | null;
};

/** Limite de ministérios que a mesma conta pode integrar (espelha public.limite_ministerios()). */
export const LIMITE_MINISTERIOS = 5;

/** Resultado possível de um pedido de ingresso por código. */
export type StatusIngresso = 'OK' | 'CODIGO_INVALIDO' | 'JA_MEMBRO' | 'JA_SOLICITADO' | 'LIMITE_MINISTERIOS';

/**
 * Vincula a sessão atual às linhas de membro criadas quando "eu" ainda era
 * só uma device_key. Roda uma vez por sessão: sem isso, um aparelho que já
 * usava o app antes da migration 0013 não é reconhecido como membro por
 * nenhuma policy e o ministério some da tela.
 */
let vinculoLegadoFeito: Promise<void> | null = null;
function vincularMembroLegado(): Promise<void> {
  if (!isSupabaseConfigured) return Promise.resolve();
  if (!vinculoLegadoFeito) {
    vinculoLegadoFeito = (async () => {
      await garantirSessaoAnonima();
      const { error } = await supabase.rpc('vincular_membro_legado', {
        p_device_key: getDeviceKey(),
      });
      if (error) {
        // Não é fatal: só significa que o self-heal não rodou agora. Quem
        // já tem auth_uid gravado segue funcionando normalmente.
        console.error('vincular_membro_legado:', error.message);
        vinculoLegadoFeito = null;
      }
    })();
  }
  return vinculoLegadoFeito;
}

/**
 * Busca o primeiro ministério ao qual esta conta pertence, já montado com
 * membros (+ funções de cada um), funções e solicitações pendentes.
 */
export async function buscarMeuMinisterio(): Promise<MinisterioIdentidade | null> {
  const meus = await listarMeusMinisterios();
  if (meus.length === 0) return null;
  return buscarMinisterioPorId(meus[0].id);
}

/**
 * Ministérios desta conta (até LIMITE_MINISTERIOS), em ordem de ingresso.
 * Vem por RPC porque a policy de `ministerios` só deixa ler o que já é
 * meu — a própria lista precisa ser resolvida do lado do banco.
 */
export async function listarMeusMinisterios(): Promise<MinisterioResumo[]> {
  // Sem Supabase configurado o módulo Ministério não tem onde existir — o
  // app roda com as músicas mock e o resto some da tela, em vez de
  // estourar erro de rede contra a URL placeholder (ver supabase.ts).
  if (!isSupabaseConfigured) return [];
  await vincularMembroLegado();
  const { data, error } = await supabase.rpc('meus_ministerios');
  if (error) throw error;
  return ((data ?? []) as { id: string; nome: string }[]).map((m) => ({
    id: m.id,
    nome: m.nome,
    foto: null,
  }));
}

/** Carrega um ministério específico (já sabendo que a conta pertence a ele). */
export async function buscarMinisterioPorId(ministerioId: string): Promise<MinisterioIdentidade> {
  await vincularMembroLegado();
  return carregarMinisterio(ministerioId);
}

async function carregarMinisterio(ministerioId: string): Promise<MinisterioIdentidade> {
  const authUid = await garantirSessaoAnonima();
  const [{ data: ministerio, error: e1 }, { data: membrosRaw, error: e2 }, { data: funcoesRaw, error: e3 }, { data: solicitacoesRaw, error: e4 }] =
    await Promise.all([
      supabase.from('ministerios').select('*').eq('id', ministerioId).single(),
      supabase
        .from('ministerio_membros')
        .select('id, nome, avatar_cor, admin, aniversario, auth_uid, membro_funcoes(funcao_id)')
        .eq('ministerio_id', ministerioId),
      supabase.from('funcoes').select('*').eq('ministerio_id', ministerioId),
      supabase
        .from('solicitacoes_ingresso')
        .select('*')
        .eq('ministerio_id', ministerioId)
        .eq('status', 'pendente'),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;
  if (e4) throw e4;

  const membros: MembroMinisterio[] = (membrosRaw ?? []).map((m) => ({
    id: m.id,
    nome: m.nome,
    avatarCor: m.avatar_cor,
    admin: m.admin,
    aniversario: m.aniversario ?? undefined,
    funcoes: (m.membro_funcoes ?? []).map((mf: { funcao_id: string }) => mf.funcao_id),
  }));

  const meuMembroId: string | null =
    (membrosRaw ?? []).find((m) => m.auth_uid && m.auth_uid === authUid)?.id ?? null;

  return {
    id: ministerio!.id,
    nome: ministerio!.nome,
    foto: null, // upload real fica pra quando tiver Storage ligado ao ministério
    codigoConvite: ministerio!.codigo_convite,
    membros,
    funcoes: (funcoesRaw ?? []).map((f) => ({ id: f.id, nome: f.nome, icone: f.icone })),
    solicitacoes: (solicitacoesRaw ?? []).map((s) => ({ id: s.id, nome: s.nome, codigoUsado: s.codigo_usado })),
    meuMembroId,
  };
}

/**
 * Cria o ministério, o membro admin ("eu") e as funções — tudo numa
 * transação só, do lado do banco. Antes eram três inserts soltos: se o
 * segundo falhasse sobrava um ministério sem dono, que ninguém conseguia
 * nem usar nem apagar (delete exige ser admin dele).
 */
export async function criarMinisterio(
  nome: string,
  dataNascimento?: string | null,
  funcoesCustom?: { nome: string; icone: string }[],
  nomeMembro?: string | null
): Promise<MinisterioIdentidade> {
  await garantirSessaoAnonima();
  const listaFuncoes = funcoesCustom?.length ? funcoesCustom : FUNCOES_PADRAO;

  const { data, error } = await supabase.rpc('criar_ministerio', {
    p_nome: nome,
    p_device_key: getDeviceKey(),
    p_nome_membro: nomeMembro || 'Você',
    p_aniversario: dataNascimento || null,
    p_funcoes: listaFuncoes,
  });
  if (error) {
    // a RPC sinaliza o limite levantando exceção com esta mensagem
    if (error.message.includes('LIMITE_MINISTERIOS')) throw new Error('LIMITE_MINISTERIOS');
    throw error;
  }

  return carregarMinisterio(data as string);
}

/**
 * Pede ingresso por código de convite. A resolução código -> ministério
 * acontece no banco: sem ser membro, o cliente não enxerga a linha do
 * ministério pra fazer essa busca sozinho.
 */
export async function solicitarIngresso(
  codigo: string,
  nomeSolicitante: string
): Promise<StatusIngresso> {
  await garantirSessaoAnonima();
  const { data, error } = await supabase.rpc('solicitar_ingresso', {
    p_codigo: codigo,
    p_nome: nomeSolicitante,
    p_device_key: getDeviceKey(),
  });
  if (error) throw error;
  return data as StatusIngresso;
}

export async function renomearMinisterio(ministerioId: string, nome: string) {
  await exigirLinha(
    supabase.from('ministerios').update({ nome }).eq('id', ministerioId).select('id'),
    'renomearMinisterio'
  );
}

export async function regenerarCodigoConvite(ministerioId: string): Promise<string> {
  const { data, error } = await supabase.rpc('gerar_codigo_convite');
  if (error) throw error;
  const codigo = data as string;
  await exigirLinha(
    supabase.from('ministerios').update({ codigo_convite: codigo }).eq('id', ministerioId).select('id'),
    'regenerarCodigoConvite'
  );
  return codigo;
}

/**
 * Sai do ministério. Antes apagava por device_key: quem tinha entrado pela
 * conta Google em outro aparelho não apagava linha nenhuma e continuava
 * membro, sem nenhum aviso.
 */
export async function sairDoMinisterio(ministerioId: string) {
  const authUid = await garantirSessaoAnonima();
  if (!authUid) throw new Error('sairDoMinisterio: sessão indisponível');
  await exigirLinhas(
    supabase
      .from('ministerio_membros')
      .delete()
      .eq('ministerio_id', ministerioId)
      .eq('auth_uid', authUid)
      .select('id'),
    'sairDoMinisterio'
  );
}

export async function excluirMinisterio(ministerioId: string) {
  await exigirLinha(
    supabase.from('ministerios').delete().eq('id', ministerioId).select('id'),
    'excluirMinisterio'
  );
}

export async function definirAdmin(membroId: string, admin: boolean) {
  await exigirLinha(
    supabase.from('ministerio_membros').update({ admin }).eq('id', membroId).select('id'),
    'definirAdmin'
  );
}

export async function removerMembro(membroId: string) {
  await exigirLinha(
    supabase.from('ministerio_membros').delete().eq('id', membroId).select('id'),
    'removerMembro'
  );
}

/** Aprova o ingresso: cria o membro (sem funções ainda) e consome a solicitação. */
export async function aprovarSolicitacao(_ministerioId: string, solicitacao: SolicitacaoIngresso) {
  const { error } = await supabase.rpc('aprovar_solicitacao', { p_solicitacao_id: solicitacao.id });
  if (error) throw error;
}

export async function recusarSolicitacao(id: string) {
  await exigirLinha(
    supabase.from('solicitacoes_ingresso').delete().eq('id', id).select('id'),
    'recusarSolicitacao'
  );
}

export async function criarFuncao(ministerioId: string, nome: string, icone: string) {
  await exigirLinha(
    supabase.from('funcoes').insert({ ministerio_id: ministerioId, nome, icone }).select('id'),
    'criarFuncao'
  );
}

export async function editarFuncao(funcaoId: string, nome: string, icone: string) {
  await exigirLinha(
    supabase.from('funcoes').update({ nome, icone }).eq('id', funcaoId).select('id'),
    'editarFuncao'
  );
}

export async function removerFuncao(funcaoId: string) {
  await exigirLinha(
    supabase.from('funcoes').delete().eq('id', funcaoId).select('id'),
    'removerFuncao'
  );
}
