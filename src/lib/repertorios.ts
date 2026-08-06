import type { MomentoMissa } from '../types/musica';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Repertórios: usa Supabase (tabelas `repertorios` + `repertorio_musicas`)
 * quando configurado, com fallback pra localStorage caso contrário — mesmo
 * padrão do musicasApi.ts.
 *
 * Sem autenticação ainda: cada dispositivo tem uma `device_key` (UUID
 * gerado uma vez e salvo em localStorage) que funciona como "dono"
 * pseudônimo pra filtrar "meus repertórios". Não é segurança de verdade —
 * ver comentário na migration 0003_repertorios_sem_auth.sql.
 */

const STORAGE_KEY_MOCK = 'repertorios:v1';
const DEVICE_KEY_STORAGE = 'device_key:v1';

export interface ItemRepertorio {
  musicaId: string;
  title: string;
  artist: string | null;
  tone: string;
  momento: MomentoMissa | null;
}

export interface Repertorio {
  id: string;
  nome: string;
  criadoEm: string; // ISO
  shareToken: string | null;
  itens: ItemRepertorio[];
}

export function getDeviceKey(): string {
  let key = localStorage.getItem(DEVICE_KEY_STORAGE);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY_STORAGE, key);
  }
  return key;
}

function gerarIdMock(): string {
  return `rep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Fallback mock (localStorage) ----------

function lerMock(): Repertorio[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MOCK);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function salvarMock(lista: Repertorio[]): void {
  localStorage.setItem(STORAGE_KEY_MOCK, JSON.stringify(lista));
}

// ---------- Mapeamento Supabase -> domínio ----------

interface LinhaRepertorioSupabase {
  id: string;
  nome: string;
  created_at: string;
  share_token: string | null;
  repertorio_musicas: {
    musica_id: string;
    momento: MomentoMissa | null;
    tom_escolhido: string | null;
    ordem: number;
    musicas: { title: string; artist: string | null; original_tone: string } | null;
  }[];
}

const SELECT_REPERTORIO =
  'id, nome, created_at, share_token, repertorio_musicas(musica_id, momento, tom_escolhido, ordem, musicas(title, artist, original_tone))';

function mapearRepertorio(row: LinhaRepertorioSupabase): Repertorio {
  const itens = [...row.repertorio_musicas]
    .sort((a, b) => a.ordem - b.ordem)
    .map((r) => ({
      musicaId: r.musica_id,
      title: r.musicas?.title ?? '(música removida)',
      artist: r.musicas?.artist ?? null,
      tone: r.tom_escolhido ?? r.musicas?.original_tone ?? '',
      momento: r.momento,
    }));

  return {
    id: row.id,
    nome: row.nome,
    criadoEm: row.created_at,
    shareToken: row.share_token,
    itens,
  };
}

// ---------- API pública ----------

export async function listarRepertorios(): Promise<Repertorio[]> {
  if (!isSupabaseConfigured) {
    return lerMock().sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }

  const { data, error } = await supabase
    .from('repertorios')
    .select(SELECT_REPERTORIO)
    .eq('device_key', getDeviceKey())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('listarRepertorios:', error.message);
    return [];
  }
  return ((data ?? []) as unknown as LinhaRepertorioSupabase[]).map(mapearRepertorio);
}

export async function obterRepertorioPorToken(token: string): Promise<Repertorio | null> {
  if (!isSupabaseConfigured) return null; // compartilhamento por link exige backend real

  const { data, error } = await supabase
    .from('repertorios')
    .select(SELECT_REPERTORIO)
    .eq('share_token', token)
    .maybeSingle();

  if (error) {
    console.error('obterRepertorioPorToken:', error.message);
    return null;
  }
  return data ? mapearRepertorio(data as unknown as LinhaRepertorioSupabase) : null;
}

export async function obterRepertorio(id: string): Promise<Repertorio | null> {
  if (!isSupabaseConfigured) {
    return lerMock().find((r) => r.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from('repertorios')
    .select(SELECT_REPERTORIO)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('obterRepertorio:', error.message);
    return null;
  }
  return data ? mapearRepertorio(data as unknown as LinhaRepertorioSupabase) : null;
}

export async function criarRepertorio(nome: string): Promise<Repertorio> {
  const nomeFinal = nome.trim() || 'Repertório sem nome';

  if (!isSupabaseConfigured) {
    const novo: Repertorio = {
      id: gerarIdMock(),
      nome: nomeFinal,
      criadoEm: new Date().toISOString(),
      shareToken: null,
      itens: [],
    };
    salvarMock([...lerMock(), novo]);
    return novo;
  }

  const { data, error } = await supabase
    .from('repertorios')
    .insert({ nome: nomeFinal, device_key: getDeviceKey() })
    .select(SELECT_REPERTORIO)
    .single();

  if (error) throw new Error(`criarRepertorio: ${error.message}`);
  return mapearRepertorio(data as unknown as LinhaRepertorioSupabase);
}

export async function renomearRepertorio(id: string, nome: string): Promise<void> {
  const nomeFinal = nome.trim();
  if (!nomeFinal) return;

  if (!isSupabaseConfigured) {
    salvarMock(lerMock().map((r) => (r.id === id ? { ...r, nome: nomeFinal } : r)));
    return;
  }

  const { error } = await supabase.from('repertorios').update({ nome: nomeFinal }).eq('id', id);
  if (error) console.error('renomearRepertorio:', error.message);
}

export async function removerRepertorio(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    salvarMock(lerMock().filter((r) => r.id !== id));
    return;
  }

  const { error } = await supabase.from('repertorios').delete().eq('id', id);
  if (error) console.error('removerRepertorio:', error.message);
}

export async function adicionarMusica(repertorioId: string, item: ItemRepertorio): Promise<void> {
  if (!isSupabaseConfigured) {
    salvarMock(
      lerMock().map((r) => {
        if (r.id !== repertorioId) return r;
        if (r.itens.some((i) => i.musicaId === item.musicaId)) return r;
        return { ...r, itens: [...r.itens, item] };
      })
    );
    return;
  }

  // ordem = depois do último item existente
  const { count } = await supabase
    .from('repertorio_musicas')
    .select('*', { count: 'exact', head: true })
    .eq('repertorio_id', repertorioId);

  const { error } = await supabase.from('repertorio_musicas').insert({
    repertorio_id: repertorioId,
    musica_id: item.musicaId,
    momento: item.momento,
    tom_escolhido: item.tone,
    ordem: count ?? 0,
  });

  // conflito de chave primária (repertorio_id, musica_id) = música já está lá — ignora
  if (error && !error.message.includes('duplicate')) {
    console.error('adicionarMusica:', error.message);
  }
}

export async function removerMusica(repertorioId: string, musicaId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    salvarMock(
      lerMock().map((r) =>
        r.id === repertorioId
          ? { ...r, itens: r.itens.filter((i) => i.musicaId !== musicaId) }
          : r
      )
    );
    return;
  }

  const { error } = await supabase
    .from('repertorio_musicas')
    .delete()
    .eq('repertorio_id', repertorioId)
    .eq('musica_id', musicaId);

  if (error) console.error('removerMusica:', error.message);
}
