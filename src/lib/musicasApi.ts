import type { Musica, MomentoMissa, TempoLiturgico } from '../types/musica';
import { mockMusicas } from './mockMusicas';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Camada de acesso a dados. Usa o Supabase real quando
 * VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY estão configurados (ver
 * supabase.ts); cai pro `mockMusicas` local caso contrário — útil pra
 * desenvolver sem depender de credenciais.
 */

export interface FiltroMusicas {
  tempo?: TempoLiturgico;
  momento?: MomentoMissa;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove acentos
}

// ---------- Linha bruta do Supabase -> Musica do domínio ----------

interface LinhaMusicaSupabase {
  id: string;
  slug: string;
  title: string;
  artist: string | null;
  original_tone: string;
  difficulty: number | null;
  capo: number;
  youtube_url: string | null;
  lyrics: string | null;
  chords_content: string;
  views_count: number;
  musica_tempo_liturgico: { tempo: TempoLiturgico }[];
  musica_ciclo: { ciclo: 'A' | 'B' | 'C' }[];
  musica_momento: { momento: MomentoMissa }[];
}

const SELECT_COM_RELACOES =
  '*, musica_tempo_liturgico(tempo), musica_ciclo(ciclo), musica_momento(momento)';

function mapearLinha(row: LinhaMusicaSupabase): Musica {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    artist: row.artist,
    originalTone: row.original_tone,
    difficulty: row.difficulty,
    capo: row.capo,
    youtubeUrl: row.youtube_url,
    lyrics: row.lyrics,
    chordsContent: row.chords_content,
    viewsCount: row.views_count,
    tempoLiturgico: row.musica_tempo_liturgico.map((r) => r.tempo),
    ciclo: row.musica_ciclo.map((r) => r.ciclo),
    momento: row.musica_momento.map((r) => r.momento),
  };
}

// ---------- Fallback mock (filtra em memória) ----------

function filtrarMock(lista: Musica[], filtro: FiltroMusicas): Musica[] {
  let resultado = lista;
  if (filtro.tempo) resultado = resultado.filter((m) => m.tempoLiturgico.includes(filtro.tempo!));
  if (filtro.momento) resultado = resultado.filter((m) => m.momento.includes(filtro.momento!));
  return resultado;
}

// ---------- API pública ----------

export async function getMusicaById(id: string): Promise<Musica | null> {
  if (!isSupabaseConfigured) {
    return mockMusicas.find((m) => m.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from('musicas')
    .select(SELECT_COM_RELACOES)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('getMusicaById:', error.message);
    return null;
  }
  return data ? mapearLinha(data as unknown as LinhaMusicaSupabase) : null;
}

export async function getTop50(filtro: FiltroMusicas = {}): Promise<Musica[]> {
  if (!isSupabaseConfigured) {
    return filtrarMock([...mockMusicas], filtro)
      .sort((a, b) => b.viewsCount - a.viewsCount)
      .slice(0, 50);
  }

  const { data, error } = await supabase
    .from('musicas')
    .select(SELECT_COM_RELACOES)
    .order('views_count', { ascending: false })
    .limit(50);

  if (error) {
    console.error('getTop50:', error.message);
    return [];
  }
  const linhas = (data ?? []) as unknown as LinhaMusicaSupabase[];
  let musicas = linhas.map(mapearLinha);

  // filtros aplicados no cliente: .eq em relação aninhada do PostgREST
  // filtraria a relação, não a linha principal — mais simples e correto
  // filtrar depois de já ter os itens e as relações completas
  if (filtro.tempo) musicas = musicas.filter((m) => m.tempoLiturgico.includes(filtro.tempo!));
  if (filtro.momento) musicas = musicas.filter((m) => m.momento.includes(filtro.momento!));

  return musicas;
}

export async function searchMusicas(
  query: string,
  filtro: FiltroMusicas = {}
): Promise<Musica[]> {
  const termo = query.trim();

  if (!isSupabaseConfigured) {
    const termoNormalizado = normalizar(termo);
    const lista = filtrarMock([...mockMusicas], filtro);
    if (!termoNormalizado) return lista.sort((a, b) => b.viewsCount - a.viewsCount);
    return lista
      .filter((m) => normalizar(`${m.title} ${m.artist ?? ''}`).includes(termoNormalizado))
      .sort((a, b) => b.viewsCount - a.viewsCount);
  }

  if (!termo) return getTop50(filtro);

  // full-text (título/artista/letra) via a coluna search_vector gerada na
  // migration; fallback pra ilike se a busca textual falhar
  const { data, error } = await supabase
    .from('musicas')
    .select(SELECT_COM_RELACOES)
    .textSearch('search_vector', termo, { type: 'websearch', config: 'portuguese' })
    .order('views_count', { ascending: false });

  if (error) {
    console.error('searchMusicas (textSearch):', error.message);
    const { data: dataIlike, error: errorIlike } = await supabase
      .from('musicas')
      .select(SELECT_COM_RELACOES)
      .ilike('title', `%${termo}%`)
      .order('views_count', { ascending: false });
    if (errorIlike) {
      console.error('searchMusicas (ilike):', errorIlike.message);
      return [];
    }
    return ((dataIlike ?? []) as unknown as LinhaMusicaSupabase[]).map(mapearLinha);
  }

  let musicas = ((data ?? []) as unknown as LinhaMusicaSupabase[]).map(mapearLinha);
  if (filtro.tempo) musicas = musicas.filter((m) => m.tempoLiturgico.includes(filtro.tempo!));
  if (filtro.momento) musicas = musicas.filter((m) => m.momento.includes(filtro.momento!));
  return musicas;
}
