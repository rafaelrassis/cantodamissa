import { supabase } from './supabase';
import type { Equipe } from '../types/ministerio';

type EquipeRow = { id: string; nome: string; equipe_membros: { membro_id: string }[] };

function mapEquipe(e: EquipeRow): Equipe {
  return { id: e.id, nome: e.nome, membroIds: (e.equipe_membros ?? []).map((m) => m.membro_id) };
}

export async function listarEquipes(ministerioId: string): Promise<Equipe[]> {
  const { data, error } = await supabase
    .from('equipes')
    .select('*, equipe_membros(membro_id)')
    .eq('ministerio_id', ministerioId)
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapEquipe as (e: unknown) => Equipe);
}

export async function criarEquipe(ministerioId: string, nome: string, membroIds: string[]): Promise<Equipe> {
  const { data: nova, error } = await supabase
    .from('equipes')
    .insert({ ministerio_id: ministerioId, nome })
    .select()
    .single();
  if (error) throw error;
  await gravarMembros(nova.id, membroIds);
  return { id: nova.id, nome, membroIds };
}

export async function editarEquipe(equipeId: string, nome: string, membroIds: string[]): Promise<void> {
  const { error } = await supabase.from('equipes').update({ nome }).eq('id', equipeId);
  if (error) throw error;
  await gravarMembros(equipeId, membroIds);
}

export async function excluirEquipe(equipeId: string): Promise<void> {
  const { error } = await supabase.from('equipes').delete().eq('id', equipeId);
  if (error) throw error;
}

async function gravarMembros(equipeId: string, membroIds: string[]) {
  const { error: erroDelete } = await supabase.from('equipe_membros').delete().eq('equipe_id', equipeId);
  if (erroDelete) throw erroDelete;
  if (membroIds.length === 0) return;
  const { error: erroInsert } = await supabase
    .from('equipe_membros')
    .insert(membroIds.map((membroId) => ({ equipe_id: equipeId, membro_id: membroId })));
  if (erroInsert) throw erroInsert;
}
