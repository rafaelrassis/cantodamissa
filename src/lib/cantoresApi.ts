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

function mapearMusicaResumo(row: LinhaMusicaResumo, cantorId: string, cantorSlug: string): Musica {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    artist: row.artist,
    cantorId,
    cantorSlug,
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

/**
 * Resolve o slug de um cantor a partir do id — usado pelo CifraReader pra
 * linkar o artista sem depender de embed `cantores(slug)` nas queries de
 * listagem (getTop50 etc.), que quebrariam a Home inteira se a relação
 * falhar no PostgREST.
 */
export async function getCantorSlugById(cantorId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('cantores')
    .select('slug')
    .eq('id', cantorId)
    .maybeSingle();

  if (error || !data) return null;
  return data.slug;
}

/**
 * Cantores ordenados pela soma de views_count das músicas deles. Feita como
 * duas queries simples + agregação client-side (em vez de um embed
 * `cantores.musicas(views_count)`) pelo mesmo motivo do getCantorSlugById
 * acima: embed reverso já quebrou a Home inteira quando a relação falhou no
 * PostgREST, então listagens principais não dependem dele.
 */
export async function getCantoresPopulares(limit: number = 20): Promise<Cantor[]> {
  if (!isSupabaseConfigured) return [];

  const [{ data: cantores, error: errCantores }, { data: musicas, error: errMusicas }] =
    await Promise.all([
      supabase.from('cantores').select('id, nome, slug, foto_url'),
      supabase.from('musicas').select('cantor_id, views_count').not('cantor_id', 'is', null),
    ]);

  if (errCantores || errMusicas || !cantores) {
    console.error('getCantoresPopulares:', errCantores?.message ?? errMusicas?.message);
    return [];
  }

  // Conta músicas vinculadas (não só views) pra não esconder cantor recém
  // linkado sem plays ainda — só ficam de fora cantores sem nenhuma música.
  const viewsPorCantor = new Map<string, number>();
  const cantoresComMusica = new Set<string>();
  for (const m of musicas ?? []) {
    const row = m as unknown as { cantor_id: string; views_count: number };
    cantoresComMusica.add(row.cantor_id);
    viewsPorCantor.set(row.cantor_id, (viewsPorCantor.get(row.cantor_id) ?? 0) + (row.views_count ?? 0));
  }

  return (cantores as unknown as LinhaCantorSupabase[])
    .map(mapearCantor)
    .filter((c) => cantoresComMusica.has(c.id))
    .sort((a, b) => (viewsPorCantor.get(b.id) ?? 0) - (viewsPorCantor.get(a.id) ?? 0))
    .slice(0, limit);
}

export async function getTop10PorCantor(cantorId: string, cantorSlug: string): Promise<Musica[]> {
  if (!isSupabaseConfigured) return [];

  const { data } = await supabase
    .from('musicas')
    .select(MUSICA_COLS)
    .eq('cantor_id', cantorId)
    .order('views_count', { ascending: false })
    .limit(10);

  return ((data ?? []) as unknown as LinhaMusicaResumo[]).map((row) =>
    mapearMusicaResumo(row, cantorId, cantorSlug)
  );
}

export async function getTodasAlfabeticoPorCantor(cantorId: string, cantorSlug: string): Promise<Musica[]> {
  if (!isSupabaseConfigured) return [];

  const { data } = await supabase
    .from('musicas')
    .select(MUSICA_COLS)
    .eq('cantor_id', cantorId)
    .order('title', { ascending: true });

  return ((data ?? []) as unknown as LinhaMusicaResumo[]).map((row) =>
    mapearMusicaResumo(row, cantorId, cantorSlug)
  );
}

// ---------- CRUD (AdminPanel) ----------

function exigirSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase não configurado — CRUD de cantores precisa de VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY (ver .env.example).'
    );
  }
}

function slugify(nome: string): string {
  return (
    nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'cantor'
  );
}

export interface DadosCantor {
  nome: string;
  fotoUrl: string | null;
}

export async function listarCantores(): Promise<Cantor[]> {
  exigirSupabase();
  const { data, error } = await supabase
    .from('cantores')
    .select('id, nome, slug, foto_url')
    .order('nome', { ascending: true });

  if (error) throw new Error(`listarCantores: ${error.message}`);
  return ((data ?? []) as unknown as LinhaCantorSupabase[]).map(mapearCantor);
}

export async function criarCantor(dados: DadosCantor): Promise<Cantor> {
  exigirSupabase();

  const slugBase = slugify(dados.nome);
  let slug = slugBase;
  for (let tentativa = 2; tentativa <= 20; tentativa++) {
    const { data: existente } = await supabase.from('cantores').select('id').eq('slug', slug).maybeSingle();
    if (!existente) break;
    slug = `${slugBase}-${tentativa}`;
  }

  const { data, error } = await supabase
    .from('cantores')
    .insert({ nome: dados.nome, slug, foto_url: dados.fotoUrl })
    .select('id, nome, slug, foto_url')
    .single();

  if (error) throw new Error(`criarCantor: ${error.message}`);
  return mapearCantor(data as unknown as LinhaCantorSupabase);
}

export async function atualizarCantor(id: string, dados: DadosCantor): Promise<Cantor> {
  exigirSupabase();

  const { data, error } = await supabase
    .from('cantores')
    .update({ nome: dados.nome, foto_url: dados.fotoUrl })
    .eq('id', id)
    .select('id, nome, slug, foto_url')
    .single();

  if (error) throw new Error(`atualizarCantor: ${error.message}`);
  return mapearCantor(data as unknown as LinhaCantorSupabase);
}

export async function excluirCantor(id: string): Promise<void> {
  exigirSupabase();
  const { error } = await supabase.from('cantores').delete().eq('id', id);
  if (error) throw new Error(`excluirCantor: ${error.message}`);
}
