import { supabase } from './supabase';
import type { Aviso } from '../types/ministerio';

type AvisoRow = {
  id: string;
  titulo: string;
  descricao: string;
  em_destaque: boolean;
  arquivado: boolean;
  criado_em: string;
};

function mapAviso(a: AvisoRow): Aviso {
  return {
    id: a.id,
    titulo: a.titulo,
    descricao: a.descricao,
    emDestaque: a.em_destaque,
    arquivado: a.arquivado,
    criadoEm: a.criado_em,
  };
}

export async function listarAvisos(ministerioId: string): Promise<Aviso[]> {
  const { data, error } = await supabase
    .from('avisos')
    .select('*')
    .eq('ministerio_id', ministerioId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapAviso);
}

export async function criarAviso(
  ministerioId: string,
  titulo: string,
  descricao: string,
  emDestaque: boolean
): Promise<Aviso> {
  const { data, error } = await supabase
    .from('avisos')
    .insert({ ministerio_id: ministerioId, titulo, descricao, em_destaque: emDestaque })
    .select()
    .single();
  if (error) throw error;
  return mapAviso(data);
}

export async function arquivarAviso(avisoId: string): Promise<void> {
  const { error } = await supabase.from('avisos').update({ arquivado: true }).eq('id', avisoId);
  if (error) throw error;
}
