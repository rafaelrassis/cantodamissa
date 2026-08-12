import { supabase } from './supabase';
import type { Indisponibilidade } from '../types/ministerio';

type IndisponibilidadeRow = { id: string; membro_id: string; data: string; motivo: string };

function mapIndisponibilidade(i: IndisponibilidadeRow): Indisponibilidade {
  return { id: i.id, membroId: i.membro_id, data: i.data, motivo: i.motivo };
}

export async function listarIndisponibilidades(ministerioId: string): Promise<Indisponibilidade[]> {
  const { data, error } = await supabase
    .from('indisponibilidades')
    .select('*')
    .eq('ministerio_id', ministerioId)
    .order('data', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapIndisponibilidade);
}

export async function criarIndisponibilidade(
  ministerioId: string,
  membroId: string,
  data: string,
  motivo: string
): Promise<Indisponibilidade> {
  const { data: nova, error } = await supabase
    .from('indisponibilidades')
    .insert({ ministerio_id: ministerioId, membro_id: membroId, data, motivo })
    .select()
    .single();
  if (error) throw error;
  return mapIndisponibilidade(nova);
}
