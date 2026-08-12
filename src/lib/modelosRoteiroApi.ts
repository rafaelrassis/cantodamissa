import { supabase } from './supabase';
import type { ItemRoteiro, ModeloRoteiro } from '../types/ministerio';

type ModeloRow = {
  id: string;
  nome: string;
  modelo_roteiro_itens: {
    id: string;
    ordem: number;
    titulo: string;
    descricao: string;
    duracao_segundos: number | null;
    icone: string | null;
  }[];
};

function mapModelo(m: ModeloRow): ModeloRoteiro {
  return {
    id: m.id,
    nome: m.nome,
    itens: (m.modelo_roteiro_itens ?? [])
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((i) => ({
        id: i.id,
        tipo: 'evento' as const,
        titulo: i.titulo,
        descricao: i.descricao,
        duracaoSegundos: i.duracao_segundos ?? undefined,
        icone: i.icone ?? undefined,
      })),
  };
}

export async function listarModelosRoteiro(ministerioId: string): Promise<ModeloRoteiro[]> {
  const { data, error } = await supabase
    .from('modelos_roteiro')
    .select('*, modelo_roteiro_itens(*)')
    .eq('ministerio_id', ministerioId)
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapModelo as (m: unknown) => ModeloRoteiro);
}

export async function criarModeloRoteiro(
  ministerioId: string,
  nome: string,
  itens: ItemRoteiro[]
): Promise<ModeloRoteiro> {
  const { data: novo, error } = await supabase
    .from('modelos_roteiro')
    .insert({ ministerio_id: ministerioId, nome })
    .select()
    .single();
  if (error) throw error;

  const eventos = itens.filter((r) => (r.tipo ?? 'evento') === 'evento');
  if (eventos.length > 0) {
    const { error: erroItens } = await supabase.from('modelo_roteiro_itens').insert(
      eventos.map((r, i) => ({
        modelo_id: novo.id,
        ordem: i,
        titulo: r.titulo ?? '',
        descricao: r.descricao ?? '',
        duracao_segundos: r.duracaoSegundos ?? null,
        icone: r.icone ?? null,
      }))
    );
    if (erroItens) throw erroItens;
  }

  return { id: novo.id, nome, itens: eventos };
}

export async function excluirModeloRoteiro(modeloId: string): Promise<void> {
  const { error } = await supabase.from('modelos_roteiro').delete().eq('id', modeloId);
  if (error) throw error;
}
