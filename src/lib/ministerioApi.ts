// Camada de dados real do Ministério (Supabase) — substitui o estado
// levantado em memória do protótipo original.
//
// Sem auth ainda (ver ADR no chat "remover auth"): cada dispositivo tem uma
// device_key (mesma função getDeviceKey() de repertorios.ts) que funciona
// como "dono" pseudônimo. RLS das tabelas de ministério é pública
// temporária (ver supabase/migrations/0009_ministerio.sql) — quando
// entrar auth de verdade, troca-se por policies com auth.uid() e esta
// camada muda pouco (só o campo usado como "quem sou eu").

import { supabase } from './supabase';
import { getDeviceKey } from './repertorios';
import { garantirSessaoAnonima } from './supabaseAuth';
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

/** Limite de ministérios que um mesmo device_key pode integrar. */
export const LIMITE_MINISTERIOS = 5;

function gerarCodigo(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let sufixo = '';
  for (let i = 0; i < 4; i++) sufixo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return `CDM-${sufixo}`;
}

/**
 * Busca o ministério ao qual este dispositivo pertence (se houver), já
 * montado com membros (+ funções de cada um), funções do ministério e
 * solicitações pendentes. Retorna null se o device_key não é membro de
 * nenhum ministério.
 */
export async function buscarMeuMinisterio(): Promise<MinisterioIdentidade | null> {
  const meus = await listarMeusMinisterios();
  if (meus.length === 0) return null;
  return buscarMinisterioPorId(meus[0].id);
}

/**
 * Lista todos os ministérios (até LIMITE_MINISTERIOS) aos quais este
 * device_key pertence, em ordem de ingresso. Usado pelo seletor de
 * ministério (trocar/adicionar) — ver useMinisterio.ts.
 */
export async function listarMeusMinisterios(): Promise<MinisterioResumo[]> {
  const deviceKey = getDeviceKey();
  const { data, error } = await supabase
    .from('ministerio_membros')
    .select('ministerio_id, criado_em, ministerios(id, nome)')
    .eq('device_key', deviceKey)
    .order('criado_em', { ascending: true });
  if (error) throw error;
  const resultado: MinisterioResumo[] = [];
  for (const m of data ?? []) {
    const mn = Array.isArray(m.ministerios) ? m.ministerios[0] : m.ministerios;
    if (mn) resultado.push({ id: mn.id as string, nome: mn.nome as string, foto: null });
  }
  return resultado;
}

/** Carrega um ministério específico (já sabendo que o device pertence a ele). */
export async function buscarMinisterioPorId(ministerioId: string): Promise<MinisterioIdentidade> {
  const authUid = await garantirSessaoAnonima();
  const deviceKey = getDeviceKey();

  // Self-heal: vincula esta sessão anônima ao membro (ver
  // 0011_ministerio_rls_admin.sql) — sem isso as policies de admin não
  // reconhecem este device.
  const { data: meuMembro } = await supabase
    .from('ministerio_membros')
    .select('id, auth_uid')
    .eq('ministerio_id', ministerioId)
    .eq('device_key', deviceKey)
    .maybeSingle();
  if (meuMembro && authUid && meuMembro.auth_uid !== authUid) {
    await supabase.from('ministerio_membros').update({ auth_uid: authUid }).eq('id', meuMembro.id);
  }

  return carregarMinisterio(ministerioId);
}

async function carregarMinisterio(ministerioId: string): Promise<MinisterioIdentidade> {
  const [{ data: ministerio, error: e1 }, { data: membrosRaw, error: e2 }, { data: funcoesRaw, error: e3 }, { data: solicitacoesRaw, error: e4 }] =
    await Promise.all([
      supabase.from('ministerios').select('*').eq('id', ministerioId).single(),
      supabase
        .from('ministerio_membros')
        .select('id, nome, avatar_cor, admin, aniversario, device_key, membro_funcoes(funcao_id)')
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

  const deviceKey = getDeviceKey();
  const membros: MembroMinisterio[] = (membrosRaw ?? []).map((m) => ({
    id: m.id,
    nome: m.nome,
    avatarCor: m.avatar_cor,
    admin: m.admin,
    aniversario: m.aniversario ?? undefined,
    funcoes: (m.membro_funcoes ?? []).map((mf: { funcao_id: string }) => mf.funcao_id),
  }));
  const meuMembroId = (membrosRaw ?? []).find((m) => m.device_key === deviceKey)?.id ?? null;

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
 * Cria o ministério, o membro admin ("você", com aniversário da conta se
 * houver) e semeia a lista padrão de funções. `funcoesCustom` (opcional)
 * substitui a lista padrão — vem da personalização feita em
 * AdicionarMinisterioTela antes de salvar.
 */
export async function criarMinisterio(
  nome: string,
  dataNascimento?: string | null,
  funcoesCustom?: { nome: string; icone: string }[]
): Promise<MinisterioIdentidade> {
  const authUid = await garantirSessaoAnonima();
  const deviceKey = getDeviceKey();

  if ((await listarMeusMinisterios()).length >= LIMITE_MINISTERIOS) {
    throw new Error(`LIMITE_MINISTERIOS`);
  }

  const codigoConvite = gerarCodigo();

  const { data: ministerio, error: erroMinisterio } = await supabase
    .from('ministerios')
    .insert({ nome, codigo_convite: codigoConvite, criado_por_device_key: deviceKey })
    .select()
    .single();
  if (erroMinisterio) throw erroMinisterio;

  const { error: erroMembro } = await supabase.from('ministerio_membros').insert({
    ministerio_id: ministerio.id,
    device_key: deviceKey,
    auth_uid: authUid,
    nome: 'Você',
    avatar_cor: 'bg-teal-500',
    admin: true,
    aniversario: dataNascimento || null,
  });
  if (erroMembro) throw erroMembro;

  const listaFuncoes = funcoesCustom?.length ? funcoesCustom : FUNCOES_PADRAO;
  const { error: erroFuncoes } = await supabase
    .from('funcoes')
    .insert(listaFuncoes.map((f) => ({ ministerio_id: ministerio.id, nome: f.nome, icone: f.icone })));
  if (erroFuncoes) throw erroFuncoes;

  return carregarMinisterio(ministerio.id);
}

/** Confere se o código existe; se sim, cria a solicitação de ingresso. */
export async function solicitarIngresso(codigo: string, nomeSolicitante: string): Promise<boolean> {
  const authUid = await garantirSessaoAnonima();

  const meusMinisterios = await listarMeusMinisterios();
  if (meusMinisterios.length >= LIMITE_MINISTERIOS) {
    throw new Error(`LIMITE_MINISTERIOS`);
  }

  const codigoNormalizado = codigo.trim().toUpperCase();
  const { data: ministerio, error: erroBusca } = await supabase
    .from('ministerios')
    .select('id')
    .eq('codigo_convite', codigoNormalizado)
    .maybeSingle();
  if (erroBusca) throw erroBusca;
  if (!ministerio) return false;

  // Já é membro (admin ou não) desse ministério — não faz sentido abrir
  // uma nova solicitação de ingresso pra algo que já pertence.
  if (meusMinisterios.some((m) => m.id === ministerio.id)) {
    throw new Error('JA_MEMBRO');
  }

  const { error: erroInsert } = await supabase.from('solicitacoes_ingresso').insert({
    ministerio_id: ministerio.id,
    device_key: getDeviceKey(),
    auth_uid: authUid,
    nome: nomeSolicitante,
    codigo_usado: codigoNormalizado,
  });
  if (erroInsert) throw erroInsert;
  return true;
}

export async function renomearMinisterio(ministerioId: string, nome: string) {
  const { error } = await supabase.from('ministerios').update({ nome }).eq('id', ministerioId);
  if (error) throw error;
}

export async function regenerarCodigoConvite(ministerioId: string): Promise<string> {
  const codigo = gerarCodigo();
  const { error } = await supabase.from('ministerios').update({ codigo_convite: codigo }).eq('id', ministerioId);
  if (error) throw error;
  return codigo;
}

export async function sairDoMinisterio(ministerioId: string) {
  const { error } = await supabase
    .from('ministerio_membros')
    .delete()
    .eq('ministerio_id', ministerioId)
    .eq('device_key', getDeviceKey());
  if (error) throw error;
}

export async function excluirMinisterio(ministerioId: string) {
  const { error } = await supabase.from('ministerios').delete().eq('id', ministerioId);
  if (error) throw error;
}

export async function definirAdmin(membroId: string, admin: boolean) {
  const { error } = await supabase.from('ministerio_membros').update({ admin }).eq('id', membroId);
  if (error) throw error;
}

export async function removerMembro(membroId: string) {
  const { error } = await supabase.from('ministerio_membros').delete().eq('id', membroId);
  if (error) throw error;
}

/** Aprova: cria o membro (sem funções ainda — atribuídas depois na Equipe) e remove a solicitação. */
export async function aprovarSolicitacao(ministerioId: string, solicitacao: SolicitacaoIngresso) {
  const { data: solicitacaoRaw, error: erroBusca } = await supabase
    .from('solicitacoes_ingresso')
    .select('device_key, auth_uid')
    .eq('id', solicitacao.id)
    .single();
  if (erroBusca) throw erroBusca;

  const { error: erroMembro } = await supabase.from('ministerio_membros').insert({
    ministerio_id: ministerioId,
    device_key: solicitacaoRaw.device_key,
    auth_uid: solicitacaoRaw.auth_uid,
    nome: solicitacao.nome,
    avatar_cor: 'bg-slate-500',
    admin: false,
  });
  if (erroMembro) throw erroMembro;

  const { error: erroDelete } = await supabase.from('solicitacoes_ingresso').delete().eq('id', solicitacao.id);
  if (erroDelete) throw erroDelete;
}

export async function recusarSolicitacao(id: string) {
  const { error } = await supabase.from('solicitacoes_ingresso').delete().eq('id', id);
  if (error) throw error;
}

export async function criarFuncao(ministerioId: string, nome: string, icone: string) {
  const { error } = await supabase.from('funcoes').insert({ ministerio_id: ministerioId, nome, icone });
  if (error) throw error;
}

export async function editarFuncao(funcaoId: string, nome: string, icone: string) {
  const { error } = await supabase.from('funcoes').update({ nome, icone }).eq('id', funcaoId);
  if (error) throw error;
}

export async function removerFuncao(funcaoId: string) {
  const { error } = await supabase.from('funcoes').delete().eq('id', funcaoId);
  if (error) throw error;
}
