import type { Musica } from '../types/musica';
import type { Cantor } from '../types/cantor';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Camada de acesso a dados da página do cantor. Feature nova (ainda sem
 * cantores cadastrados), sem fallback mock: sem Supabase configurado
 * retorna vazio, igual ao padrão de guard usado em musicasApi.ts.
 */

const MUSICA_COLS = 'id, slug, title, artist, original_tone, views_count';

interface LinhaCantorSupabase {
  id: string;
  nome: string;
  slug: string;
  foto_url: string | null;
}

function mapearCantor(row: LinhaCantorSupabase): Cantor {
  return {
    id: row.id,
    nome: row.nome,
    slug: row.slug,
    fotoUrl: row.foto_url,
  };
}

interface LinhaMusicaResumo {
  id: string;
  slug: string;
  title: string;
  artist: string | null;
  original_tone: string;
  views_count: number;
}

function mapearMusicaResumo(row: LinhaMusicaResumo): Musica {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    artist: row.artist,
    originalTone: row.original_tone,
    difficulty: null,
    capo: 0,
    youtubeUrl: null,
    lyrics: null,
    chordsContent: '',
    viewsCount: row.views_count,
    tempoLiturgico: [],
    ciclo: [],
    momento: [],
  };
}

export async function getCantorBySlug(slug: string): Promise<Cantor | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('cantores')
    .select('id, nome, slug, foto_url')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) return null;
  return mapearCantor(data);
}

export async function getTop10PorCantor(cantorId: string): Promise<Musica[]> {
  if (!isSupabaseConfigured) return [];

  const { data } = await supabase
    .from('musicas')
    .select(MUSICA_COLS)
    .eq('cantor_id', cantorId)
    .order('views_count', { ascending: false })
    .limit(10);

  return ((data ?? []) as unknown as LinhaMusicaResumo[]).map(mapearMusicaResumo);
}

export async function getTodasAlfabeticoPorCantor(cantorId: string): Promise<Musica[]> {
  if (!isSupabaseConfigured) return [];

  const { data } = await supabase
    .from('musicas')
    .select(MUSICA_COLS)
    .eq('cantor_id', cantorId)
    .order('title', { ascending: true });

  return ((data ?? []) as unknown as LinhaMusicaResumo[]).map(mapearMusicaResumo);
}
