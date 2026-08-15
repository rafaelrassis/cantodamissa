import type { Musica, MomentoMissa, TempoLiturgico, CicloDominical } from '../types/musica';
import { mockMusicas } from './mockMusicas';
import { supabase, isSupabaseConfigured } from './supabase';
import { extractLyrics } from './chordpro';

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

export function normalizar(texto: string): string {
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
  cantor_id: string | null;
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

// cantorSlug NÃO vem embutido aqui de propósito: um embed `cantores(slug)`
// nessa query (usada por getTop50/searchMusicas/toda a Home) já quebrou a
// tela inicial inteira em produção quando a relação falhou no PostgREST —
// o slug é resolvido à parte, sob demanda, em getCantorSlugById.
function mapearLinha(row: LinhaMusicaSupabase): Musica {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    artist: row.artist,
    cantorId: row.cantor_id,
    cantorSlug: null,
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

/**
 * Aplica tempo/momento no servidor usando embed com `!inner`: sem isso o
 * filtro rodava depois do `.limit()`, ou seja, sobre as N mais vistas do
 * acervo inteiro. Na prática, clicar num momento com poucas músicas entre
 * as mais vistas (Santo, Cordeiro) devolvia lista vazia mesmo havendo
 * músicas cadastradas pra ele.
 *
 * O `!inner` filtra a linha principal, mas o embed filtrado só devolve as
 * linhas que casaram — daí o `SELECT_COM_RELACOES` continuar presente
 * para trazer as relações completas de cada música.
 */
function queryMusicasFiltrada(filtro: FiltroMusicas) {
  // Os embeds com `!inner` entram só como filtro (o alias evita colidir
  // com as relações que já vêm em SELECT_COM_RELACOES).
  const partes = [SELECT_COM_RELACOES];
  if (filtro.tempo) partes.push('filtro_tempo:musica_tempo_liturgico!inner(tempo)');
  if (filtro.momento) partes.push('filtro_momento:musica_momento!inner(momento)');

  let query = supabase.from('musicas').select(partes.join(', '));
  if (filtro.tempo) query = query.eq('filtro_tempo.tempo', filtro.tempo);
  if (filtro.momento) query = query.eq('filtro_momento.momento', filtro.momento);
  return query;
}

export async function getTop50(
  filtro: FiltroMusicas = {},
  limite: number = 50
): Promise<Musica[]> {
  if (!isSupabaseConfigured) {
    return filtrarMock([...mockMusicas], filtro)
      .sort((a, b) => b.viewsCount - a.viewsCount)
      .slice(0, limite);
  }

  const { data, error } = await queryMusicasFiltrada(filtro)
    .order('views_count', { ascending: false })
    .limit(limite);

  if (error) {
    console.error('getTop50:', error.message);
    return [];
  }
  return ((data ?? []) as unknown as LinhaMusicaSupabase[]).map(mapearLinha);
}

/**
 * Soma +1 no contador de acessos da música. Vai por RPC porque `musicas`
 * só aceita escrita de admin (ver 0012_admin_real_catalogo.sql) — e antes
 * disto nada no app incrementava a coluna, então "Top 50", "Músicas em
 * alta" e "Artistas mais ouvidos" ordenavam por um número parado no seed.
 */
export async function registrarVisualizacao(musicaId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.rpc('registrar_visualizacao', { p_musica_id: musicaId });
  if (error) console.error('registrarVisualizacao:', error.message);
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
  const { data, error } = await queryMusicasFiltrada(filtro)
    .textSearch('search_vector', termo, { type: 'websearch', config: 'portuguese' })
    .order('views_count', { ascending: false });

  if (error) {
    console.error('searchMusicas (textSearch):', error.message);
    // `%` e `,` têm significado na sintaxe de filtro do PostgREST, então o
    // termo precisa ser escapado antes de virar padrão de ilike.
    const termoIlike = termo.replace(/[%_,()]/g, (c) => `\\${c}`);
    const { data: dataIlike, error: errorIlike } = await queryMusicasFiltrada(filtro)
      .ilike('title', `%${termoIlike}%`)
      .order('views_count', { ascending: false });
    if (errorIlike) {
      console.error('searchMusicas (ilike):', errorIlike.message);
      return [];
    }
    return ((dataIlike ?? []) as unknown as LinhaMusicaSupabase[]).map(mapearLinha);
  }

  return ((data ?? []) as unknown as LinhaMusicaSupabase[]).map(mapearLinha);
}

export interface ArtistaEmAlta {
  artist: string;
  totalViews: number;
  songCount: number;
}

/**
 * Agrega músicas por artista (soma de visualizações), ordenado do mais
 * ouvido pro menos. Deriva do próprio conjunto de músicas mais acessadas —
 * não é uma métrica separada de "artista mais ouvido" de verdade (exigiria
 * tracking próprio), mas serve bem como proxy pra essa fase do produto.
 */
export async function getArtistasEmAlta(limite: number = 20): Promise<ArtistaEmAlta[]> {
  const musicas = await getTop50({}, 200);
  const porArtista = new Map<string, ArtistaEmAlta>();

  for (const m of musicas) {
    const nome = m.artist?.trim();
    if (!nome) continue;
    const atual = porArtista.get(nome);
    if (atual) {
      atual.totalViews += m.viewsCount;
      atual.songCount += 1;
    } else {
      porArtista.set(nome, { artist: nome, totalViews: m.viewsCount, songCount: 1 });
    }
  }

  return [...porArtista.values()].sort((a, b) => b.totalViews - a.totalViews).slice(0, limite);
}

/** Todas as músicas de um artista (match exato no campo `artist`), ordenadas por visualizações. */
export async function getMusicasPorArtista(artista: string): Promise<Musica[]> {
  if (!isSupabaseConfigured) {
    return mockMusicas
      .filter((m) => m.artist === artista)
      .sort((a, b) => b.viewsCount - a.viewsCount);
  }

  const { data, error } = await supabase
    .from('musicas')
    .select(SELECT_COM_RELACOES)
    .eq('artist', artista)
    .order('views_count', { ascending: false });

  if (error) {
    console.error('getMusicasPorArtista:', error.message);
    return [];
  }
  return ((data ?? []) as unknown as LinhaMusicaSupabase[]).map(mapearLinha);
}

// ---------- CRUD de escrita (painel admin) ----------
//
// Sem fallback pra mock aqui de propósito: escrita sem Supabase configurado
// não tem onde persistir, então essas funções lançam erro nesse caso em vez
// de fingir sucesso sobre um array em memória que se perde no reload.

export interface DadosMusica {
  title: string;
  artist: string | null;
  cantorId?: string | null;
  originalTone: string;
  difficulty: number | null;
  capo: number;
  youtubeUrl: string | null;
  lyrics: string | null;
  chordsContent: string;
  tempoLiturgico: TempoLiturgico[];
  ciclo: CicloDominical[];
  momento: MomentoMissa[];
  sourceUrl?: string | null;
  sourceFileUrl?: string | null;
}

function slugify(titulo: string): string {
  return (
    titulo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'musica'
  );
}

function exigirSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase não configurado — CRUD de músicas precisa de VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY (ver .env.example).'
    );
  }
}

/** Grava as relações N:N (tempo/ciclo/momento) apagando e reinserindo — mais simples que diff. */
async function sincronizarRelacoes(musicaId: string, dados: DadosMusica) {
  await Promise.all([
    supabase.from('musica_tempo_liturgico').delete().eq('musica_id', musicaId),
    supabase.from('musica_ciclo').delete().eq('musica_id', musicaId),
    supabase.from('musica_momento').delete().eq('musica_id', musicaId),
  ]);

  const inserts: PromiseLike<unknown>[] = [];
  if (dados.tempoLiturgico.length) {
    inserts.push(
      supabase
        .from('musica_tempo_liturgico')
        .insert(dados.tempoLiturgico.map((tempo) => ({ musica_id: musicaId, tempo })))
    );
  }
  if (dados.ciclo.length) {
    inserts.push(
      supabase
        .from('musica_ciclo')
        .insert(dados.ciclo.map((ciclo) => ({ musica_id: musicaId, ciclo })))
    );
  }
  if (dados.momento.length) {
    inserts.push(
      supabase
        .from('musica_momento')
        .insert(dados.momento.map((momento) => ({ musica_id: musicaId, momento })))
    );
  }
  await Promise.all(inserts);
}

export async function listarTodasMusicas(): Promise<Musica[]> {
  exigirSupabase();
  const { data, error } = await supabase
    .from('musicas')
    .select(SELECT_COM_RELACOES)
    .order('title', { ascending: true });

  if (error) throw new Error(`listarTodasMusicas: ${error.message}`);
  return ((data ?? []) as unknown as LinhaMusicaSupabase[]).map(mapearLinha);
}

export async function criarMusica(dados: DadosMusica): Promise<Musica> {
  exigirSupabase();

  const slugBase = slugify(dados.title);
  let slug = slugBase;
  for (let tentativa = 2; tentativa <= 20; tentativa++) {
    const { data: existente } = await supabase.from('musicas').select('id').eq('slug', slug).maybeSingle();
    if (!existente) break;
    slug = `${slugBase}-${tentativa}`;
  }

  const { data, error } = await supabase
    .from('musicas')
    .insert({
      slug,
      title: dados.title,
      artist: dados.artist,
      cantor_id: dados.cantorId ?? null,
      original_tone: dados.originalTone,
      difficulty: dados.difficulty,
      capo: dados.capo,
      youtube_url: dados.youtubeUrl,
      lyrics: dados.lyrics ?? extractLyrics(dados.chordsContent),
      chords_content: dados.chordsContent,
      source_url: dados.sourceUrl ?? null,
      source_file_url: dados.sourceFileUrl ?? null,
    })
    .select('id')
    .single();

  if (error) throw new Error(`criarMusica: ${error.message}`);

  await sincronizarRelacoes(data.id, dados);

  const musica = await getMusicaById(data.id);
  if (!musica) throw new Error('criarMusica: música criada mas não encontrada ao reler');
  return musica;
}

export async function atualizarMusica(id: string, dados: DadosMusica): Promise<Musica> {
  exigirSupabase();

  const { error } = await supabase
    .from('musicas')
    .update({
      title: dados.title,
      artist: dados.artist,
      cantor_id: dados.cantorId ?? null,
      original_tone: dados.originalTone,
      difficulty: dados.difficulty,
      capo: dados.capo,
      youtube_url: dados.youtubeUrl,
      lyrics: dados.lyrics ?? extractLyrics(dados.chordsContent),
      chords_content: dados.chordsContent,
      source_url: dados.sourceUrl ?? null,
      source_file_url: dados.sourceFileUrl ?? null,
    })
    .eq('id', id);

  if (error) throw new Error(`atualizarMusica: ${error.message}`);

  await sincronizarRelacoes(id, dados);

  const musica = await getMusicaById(id);
  if (!musica) throw new Error('atualizarMusica: música não encontrada após update');
  return musica;
}

export async function excluirMusica(id: string): Promise<void> {
  exigirSupabase();
  const { error } = await supabase.from('musicas').delete().eq('id', id);
  if (error) throw new Error(`excluirMusica: ${error.message}`);
}
