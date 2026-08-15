// Camada de dados real de Escalas (Supabase). Estratégia de update:
// substitui por completo participantes/roteiro a cada gravação (delete +
// reinsert) — schema pequeno o bastante pra ser simples e sempre
// consistente; otimizar pra diffs/updates otimistas fica pra quando o
// módulo estiver validado (mesmo racional de useMinisterio.ts).
//
// "roteiro" só grava itens tipo 'evento' — os tipo 'musica' são
// derivados do Repertorio vinculado à escala na hora de exibir (ver
// itensRoteiroComMusicas em ministerioUtils.ts), não persistem aqui.

import { supabase } from './supabase';
import type { Escala, ItemRoteiro, ParticipanteEscala } from '../types/ministerio';

type EscalaRow = {
  id: string;
  titulo: string;
  data: string;
  hora: string;
  observacoes: string;
  publicada: boolean;
  solicitar_confirmacao: boolean;
  cor_paleta: string | null;
  escala_participantes: { membro_id: string; funcao_id: string | null; status: string }[];
  roteiro_itens: {
    id: string;
    ordem: number;
    titulo: string;
    descricao: string;
    duracao_segundos: number | null;
    icone: string | null;
  }[];
};

function mapEscala(e: EscalaRow): Escala {
  return {
    id: e.id,
    titulo: e.titulo,
    data: e.data,
    hora: e.hora,
    observacoes: e.observacoes,
    publicada: e.publicada,
    solicitarConfirmacao: e.solicitar_confirmacao,
    corPaleta: e.cor_paleta ?? undefined,
    participantes: (e.escala_participantes ?? []).map((p) => ({
      membroId: p.membro_id,
      funcaoId: p.funcao_id ?? '',
      status: p.status as ParticipanteEscala['status'],
    })),
    roteiro: (e.roteiro_itens ?? [])
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((r) => ({
        id: r.id,
        tipo: 'evento' as const,
        titulo: r.titulo,
        descricao: r.descricao,
        duracaoSegundos: r.duracao_segundos ?? undefined,
        icone: r.icone ?? undefined,
      })),
  };
}

export async function listarEscalas(ministerioId: string): Promise<Escala[]> {
  const { data, error } = await supabase
    .from('escalas')
    .select('*, escala_participantes(*), roteiro_itens(*)')
    .eq('ministerio_id', ministerioId)
    .order('data', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapEscala as (e: unknown) => Escala);
}

export type EscalaResumo = { id: string; titulo: string; data: string };

/**
 * Versão leve pro card "Meus próximos repertórios" da Início: sem
 * roteiro_itens (que puxa o roteiro inteiro de cada escala) e filtrando
 * no servidor por participação do membro + data futura, em vez de trazer
 * todas as escalas do ministério pra filtrar no cliente (era o gargalo).
 */
export async function listarProximasEscalasDoMembro(
  ministerioId: string,
  membroId: string,
  limite: number
): Promise<EscalaResumo[]> {
  // Data local, não UTC: `toISOString()` num fuso a oeste de Greenwich já
  // devolve o dia seguinte durante a noite, o que sumia com a escala de
  // hoje enquanto ela ainda não aconteceu.
  const agora = new Date();
  const hoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(
    agora.getDate()
  ).padStart(2, '0')}`;

  // A consulta parte de `escalas` (e não de escala_participantes) porque
  // ordenar por coluna de tabela referenciada só ordena o embed, não as
  // linhas de fora — com `.limit()` junto, o corte pegava escalas
  // arbitrárias em vez das mais próximas.
  const { data, error } = await supabase
    .from('escalas')
    .select('id, titulo, data, escala_participantes!inner(membro_id)')
    .eq('ministerio_id', ministerioId)
    .eq('escala_participantes.membro_id', membroId)
    .gte('data', hoje)
    .order('data', { ascending: true })
    .limit(limite);
  if (error) throw error;
  return ((data ?? []) as unknown as EscalaResumo[]).map((e) => ({
    id: e.id,
    titulo: e.titulo,
    data: e.data,
  }));
}

export async function criarEscala(ministerioId: string, escala: Escala): Promise<Escala> {
  const { data: nova, error } = await supabase
    .from('escalas')
    .insert({
      ministerio_id: ministerioId,
      titulo: escala.titulo,
      data: escala.data,
      hora: escala.hora,
      observacoes: escala.observacoes,
      publicada: escala.publicada,
      solicitar_confirmacao: escala.solicitarConfirmacao,
      cor_paleta: escala.corPaleta ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  await gravarParticipantes(nova.id, escala.participantes);
  await gravarRoteiro(nova.id, escala.roteiro);

  return { ...escala, id: nova.id };
}

export async function atualizarEscala(escala: Escala): Promise<void> {
  const { error } = await supabase
    .from('escalas')
    .update({
      titulo: escala.titulo,
      data: escala.data,
      hora: escala.hora,
      observacoes: escala.observacoes,
      publicada: escala.publicada,
      solicitar_confirmacao: escala.solicitarConfirmacao,
      cor_paleta: escala.corPaleta ?? null,
    })
    .eq('id', escala.id);
  if (error) throw error;

  await gravarParticipantes(escala.id, escala.participantes);
  await gravarRoteiro(escala.id, escala.roteiro);
}

export async function excluirEscala(escalaId: string): Promise<void> {
  const { error } = await supabase.from('escalas').delete().eq('id', escalaId);
  if (error) throw error;
}

/**
 * Sincroniza a lista de participantes preservando o que já foi respondido.
 *
 * Antes isto apagava tudo e reinseria com o `status` que estava na cópia em
 * memória do admin — ou seja, qualquer confirmação feita por um membro
 * depois que a tela de edição foi aberta voltava pra "pendente" assim que o
 * admin salvasse qualquer outra coisa (mudar o horário, por exemplo).
 * Agora só as linhas que realmente saíram são apagadas, e o status de quem
 * continua na escala vem do banco, não da tela.
 */
async function gravarParticipantes(escalaId: string, participantes: ParticipanteEscala[]) {
  const { data: atuaisRaw, error: erroLeitura } = await supabase
    .from('escala_participantes')
    .select('id, membro_id, funcao_id, status')
    .eq('escala_id', escalaId);
  if (erroLeitura) throw erroLeitura;

  const chave = (membroId: string, funcaoId: string | null) => `${membroId}|${funcaoId ?? ''}`;
  const atuais = new Map(
    (atuaisRaw ?? []).map((p) => [chave(p.membro_id, p.funcao_id), p as { id: string; status: string }])
  );
  const desejados = new Map(
    participantes.map((p) => [chave(p.membroId, p.funcaoId || null), p])
  );

  const idsParaRemover = [...atuais.entries()]
    .filter(([k]) => !desejados.has(k))
    .map(([, linha]) => linha.id);
  if (idsParaRemover.length > 0) {
    const { error } = await supabase.from('escala_participantes').delete().in('id', idsParaRemover);
    if (error) throw error;
  }

  const novos = [...desejados.entries()].filter(([k]) => !atuais.has(k));
  if (novos.length > 0) {
    const { error } = await supabase.from('escala_participantes').insert(
      novos.map(([, p]) => ({
        escala_id: escalaId,
        membro_id: p.membroId,
        funcao_id: p.funcaoId || null,
        status: p.status,
      }))
    );
    if (error) throw error;
  }
}

async function gravarRoteiro(escalaId: string, roteiro: ItemRoteiro[]) {
  const { error: erroDelete } = await supabase.from('roteiro_itens').delete().eq('escala_id', escalaId);
  if (erroDelete) throw erroDelete;
  const eventos = roteiro.filter((r) => (r.tipo ?? 'evento') === 'evento');
  if (eventos.length === 0) return;
  const { error: erroInsert } = await supabase.from('roteiro_itens').insert(
    eventos.map((r, i) => ({
      escala_id: escalaId,
      ordem: i,
      titulo: r.titulo ?? '',
      descricao: r.descricao ?? '',
      duracao_segundos: r.duracaoSegundos ?? null,
      icone: r.icone ?? null,
    }))
  );
  if (erroInsert) throw erroInsert;
}
