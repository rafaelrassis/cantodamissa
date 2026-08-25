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
  /** Escalas publicadas da data mais próxima — pode ter mais de uma
   * (ex: Missa das 10 e Missa das 18 no mesmo domingo). Ver migration 0028. */
  proximos: ProximoRepertorio[];
}

export interface ProximoRepertorioFavorito {
  ministerioId: string;
  ministerioNome: string;
  igrejaNome: string | null;
  /** Escalas publicadas da data mais próxima — pode ter mais de uma
   * (ex: Missa das 10 e Missa das 18 no mesmo domingo). A Início deixa a
   * pessoa escolher quando houver mais de uma (ver migration 0027). */
  proximos: ProximoRepertorio[];
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
  proximos: Array<{ repertorio_id: string; nome: string; data: string; hora: string }>;
}): MinisterioPublico {
  return {
    ministerioId: row.ministerio_id,
    nome: row.ministerio_nome,
    codigoConvite: row.codigo_convite,
    igrejaNome: row.igreja_nome,
    igrejaCidade: row.igreja_cidade,
    igrejaEstado: row.igreja_estado,
    proximos: (row.proximos ?? []).map((p) => mapearProximo(p)!),
  };
}

/** Busca por código da igreja vinculada (exato — ministério sem igreja
 * não aparece), por nome (parte do nome do ministério OU da igreja
 * vinculada) ou por UF + cidade — mutuamente exclusivos, sempre
 * paginada. */
export async function buscarMinisteriosPublicos(filtros: {
  codigo?: string;
  nome?: string;
  estado?: string;
  cidade?: string;
  offset?: number;
  limit?: number;
}): Promise<{ itens: MinisterioPublico[]; totalCount: number }> {
  if (!isSupabaseConfigured) return { itens: [], totalCount: 0 };
  const temCodigo = Boolean(filtros.codigo?.trim());
  const temNome = !temCodigo && Boolean(filtros.nome?.trim());
  if (!temCodigo && !temNome && !filtros.estado?.trim()) return { itens: [], totalCount: 0 };
  const { data, error } = await supabase.rpc('buscar_ministerios_publicos', {
    p_codigo: temCodigo ? filtros.codigo!.trim() : null,
    p_nome: temNome ? filtros.nome!.trim() : null,
    p_estado: temCodigo || temNome ? null : filtros.estado?.trim() || null,
    p_cidade: temCodigo || temNome ? null : filtros.cidade?.trim() || null,
    p_offset: filtros.offset ?? 0,
    p_limit: filtros.limit ?? 20,
  });
  // Erro aqui vira silenciosamente "nenhum resultado" pro usuário, o que
  // esconde problema real (ex: RPC desatualizada em produção) atrás de um
  // resultado que parece válido — deixa subir pro CanalErro, como o resto
  // da camada de dados faz.
  if (error) throw new Error(`buscarMinisteriosPublicos: ${error.message}`);
  const linhas = (data ?? []) as Array<
    Parameters<typeof mapearMinisterio>[0] & { total_count: number }
  >;
  return {
    itens: linhas.map(mapearMinisterio),
    totalCount: linhas[0]?.total_count ?? 0,
  };
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

/** Favoritos do usuário + escalas publicadas da próxima data de cada um. */
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
    proximos: Array<{ repertorio_id: string; nome: string; data: string; hora: string }>;
  }>;
  return linhas.map((l) => ({
    ministerioId: l.ministerio_id,
    ministerioNome: l.ministerio_nome,
    igrejaNome: l.igreja_nome,
    proximos: (l.proximos ?? []).map((p) => mapearProximo(p)!),
  }));
}
