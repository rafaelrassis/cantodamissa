import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Favoritar ministério: pra quem não é membro (ex: toca em mais de um
 * ministério, ou só quer acompanhar a escala) mas quer ver o repertório
 * da próxima escala na Início sem pedir ingresso. Diferente do fluxo de
 * `AdicionarMinisterioTela` (código de convite → solicitação → aprovação
 * do admin) — favoritar é imediato, exige só estar logado (migration
 * 0021_favoritos_ministerio.sql).
 */

export interface ProximoRepertorio {
  repertorioId: string;
  nome: string;
  data: string;
  hora: string;
}

export interface MinisterioPublico {
  ministerioId: string;
  nome: string;
  codigoConvite: string;
  igrejaNome: string | null;
  igrejaCidade: string | null;
  igrejaEstado: string | null;
  proximo: ProximoRepertorio | null;
}

export interface ProximoRepertorioFavorito {
  ministerioId: string;
  ministerioNome: string;
  igrejaNome: string | null;
  proximo: ProximoRepertorio | null;
}

function mapearProximo(
  p: { repertorio_id: string; nome: string; data: string; hora: string } | null
): ProximoRepertorio | null {
  return p ? { repertorioId: p.repertorio_id, nome: p.nome, data: p.data, hora: p.hora } : null;
}

function mapearMinisterio(row: {
  ministerio_id: string;
  ministerio_nome: string;
  codigo_convite: string;
  igreja_nome: string | null;
  igreja_cidade: string | null;
  igreja_estado: string | null;
  proximo: { repertorio_id: string; nome: string; data: string; hora: string } | null;
}): MinisterioPublico {
  return {
    ministerioId: row.ministerio_id,
    nome: row.ministerio_nome,
    codigoConvite: row.codigo_convite,
    igrejaNome: row.igreja_nome,
    igrejaCidade: row.igreja_cidade,
    igrejaEstado: row.igreja_estado,
    proximo: mapearProximo(row.proximo),
  };
}

/** Busca por código exato OU por igreja+UF+cidade (combináveis). */
export async function buscarMinisteriosPublicos(filtros: {
  codigo?: string;
  igreja?: string;
  estado?: string;
  cidade?: string;
}): Promise<MinisterioPublico[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.rpc('buscar_ministerios_publicos', {
    p_codigo: filtros.codigo?.trim() || null,
    p_igreja: filtros.igreja?.trim() || null,
    p_estado: filtros.estado?.trim() || null,
    p_cidade: filtros.cidade?.trim() || null,
  });
  if (error) {
    console.error('buscarMinisteriosPublicos:', error.message);
    return [];
  }
  return (data ?? []).map(mapearMinisterio);
}

/** Ids dos ministérios já favoritados pelo usuário logado. */
export async function listarIdsFavoritos(): Promise<Set<string>> {
  if (!isSupabaseConfigured) return new Set();
  const { data, error } = await supabase.from('ministerio_favoritos').select('ministerio_id');
  if (error) {
    console.error('listarIdsFavoritos:', error.message);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.ministerio_id as string));
}

export async function favoritarMinisterio(ministerioId: string): Promise<void> {
  const { error } = await supabase.from('ministerio_favoritos').insert({ ministerio_id: ministerioId });
  if (error) throw new Error(`favoritarMinisterio: ${error.message}`);
}

export async function desfavoritarMinisterio(ministerioId: string): Promise<void> {
  const { error } = await supabase
    .from('ministerio_favoritos')
    .delete()
    .eq('ministerio_id', ministerioId);
  if (error) throw new Error(`desfavoritarMinisterio: ${error.message}`);
}

/** Favoritos do usuário + repertório da próxima escala publicada de cada um. */
export async function listarFavoritosComProximoRepertorio(): Promise<ProximoRepertorioFavorito[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.rpc('meus_favoritos_com_proximo_repertorio');
  if (error) {
    console.error('listarFavoritosComProximoRepertorio:', error.message);
    return [];
  }
  const linhas = (data ?? []) as Array<{
    ministerio_id: string;
    ministerio_nome: string;
    igreja_nome: string | null;
    proximo: { repertorio_id: string; nome: string; data: string; hora: string } | null;
  }>;
  return linhas.map((l) => ({
    ministerioId: l.ministerio_id,
    ministerioNome: l.ministerio_nome,
    igrejaNome: l.igreja_nome,
    proximo: mapearProximo(l.proximo),
  }));
}
