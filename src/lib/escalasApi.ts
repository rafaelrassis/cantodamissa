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
  const hoje = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('escala_participantes')
    .select('escalas!inner(id, titulo, data, ministerio_id)')
    .eq('membro_id', membroId)
    .eq('escalas.ministerio_id', ministerioId)
    .gte('escalas.data', hoje)
    .order('data', { referencedTable: 'escalas', ascending: true })
    .limit(limite);
  if (error) throw error;
  type Linha = { escalas: EscalaResumo | EscalaResumo[] | null };
  return ((data ?? []) as unknown as Linha[])
    .map((row) => (Array.isArray(row.escalas) ? row.escalas[0] : row.escalas))
    .filter((e): e is EscalaResumo => e != null);
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

async function gravarParticipantes(escalaId: string, participantes: ParticipanteEscala[]) {
  const { error: erroDelete } = await supabase.from('escala_participantes').delete().eq('escala_id', escalaId);
  if (erroDelete) throw erroDelete;
  if (participantes.length === 0) return;
  const { error: erroInsert } = await supabase.from('escala_participantes').insert(
    participantes.map((p) => ({
      escala_id: escalaId,
      membro_id: p.membroId,
      funcao_id: p.funcaoId || null,
      status: p.status,
    }))
  );
  if (erroInsert) throw erroInsert;
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
