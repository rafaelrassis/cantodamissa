import { supabase, isSupabaseConfigured } from './supabase';
import { LABEL_MOMENTO } from './labels';

/**
 * Repertórios: usa Supabase (tabelas `repertorios`, `repertorio_musicas`,
 * `repertorio_ritos`) quando configurado, com fallback pra localStorage
 * caso contrário — mesmo padrão do musicasApi.ts.
 *
 * Sem autenticação ainda: cada dispositivo tem uma `device_key` (UUID
 * gerado uma vez e salvo em localStorage) que funciona como "dono"
 * pseudônimo pra filtrar "meus repertórios". Não é segurança de verdade —
 * ver comentário na migration 0003_repertorios_sem_auth.sql.
 *
 * Ritos: cada repertório tem sua própria lista ordenada de seções
 * (Entrada, Ato Penitencial, ...) — nasce com as 11 seções padrão da missa,
 * mas dá pra adicionar seções customizadas ou excluir as que não vão ser
 * usadas. Cada música do repertório fica associada a um rito pelo *nome*
 * (texto livre — ver migration 0004_repertorio_ritos.sql).
 */

const STORAGE_KEY_MOCK = 'repertorios:v1';
const DEVICE_KEY_STORAGE = 'device_key:v1';

export const RITOS_PADRAO = [
  'Entrada',
  'Ato Penitencial',
  'Glória',
  'Salmo Responsorial',
  'Aclamação ao Evangelho',
  'Ofertório',
  'Santo',
  'Cordeiro',
  'Comunhão',
  'Pós-Comunhão',
  'Envio',
];

export const RITO_SEM_SECAO = 'Sem rito definido';

export interface ItemRepertorio {
  musicaId: string;
  title: string;
  artist: string | null;
  tone: string;
  momento: string | null; // nome do rito (texto livre, casa com Repertorio.ritos)
}

export interface Repertorio {
  id: string;
  nome: string;
  criadoEm: string; // ISO
  shareToken: string | null;
  ritos: string[]; // ordenados
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
  repertorio_ritos: { nome: string; ordem: number }[];
  repertorio_musicas: {
    musica_id: string;
    momento: string | null;
    tom_escolhido: string | null;
    ordem: number;
    musicas: { title: string; artist: string | null; original_tone: string } | null;
  }[];
}

const SELECT_REPERTORIO =
  'id, nome, created_at, share_token, ' +
  'repertorio_ritos(nome, ordem), ' +
  'repertorio_musicas(musica_id, momento, tom_escolhido, ordem, musicas(title, artist, original_tone))';

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

  const ritos = [...row.repertorio_ritos].sort((a, b) => a.ordem - b.ordem).map((r) => r.nome);

  return {
    id: row.id,
    nome: row.nome,
    criadoEm: row.created_at,
    shareToken: row.share_token,
    ritos,
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
      ritos: [...RITOS_PADRAO],
      itens: [],
    };
    salvarMock([...lerMock(), novo]);
    return novo;
  }

  const { data, error } = await supabase
    .from('repertorios')
    .insert({ nome: nomeFinal, device_key: getDeviceKey() })
    .select('id')
    .single();

  if (error) throw new Error(`criarRepertorio: ${error.message}`);

  // seed dos ritos padrão da missa, nessa ordem
  const { error: errorRitos } = await supabase.from('repertorio_ritos').insert(
    RITOS_PADRAO.map((nome, ordem) => ({ repertorio_id: data.id, nome, ordem }))
  );
  if (errorRitos) console.error('criarRepertorio (seed ritos):', errorRitos.message);

  const criado = await obterRepertorio(data.id);
  if (!criado) throw new Error('criarRepertorio: falha ao recarregar após criar');
  return criado;
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

// ---------- Ritos ----------

export async function adicionarRito(repertorioId: string, nome: string): Promise<void> {
  const nomeFinal = nome.trim();
  if (!nomeFinal) return;

  if (!isSupabaseConfigured) {
    salvarMock(
      lerMock().map((r) =>
        r.id === repertorioId && !r.ritos.includes(nomeFinal)
          ? { ...r, ritos: [...r.ritos, nomeFinal] }
          : r
      )
    );
    return;
  }

  const { count } = await supabase
    .from('repertorio_ritos')
    .select('*', { count: 'exact', head: true })
    .eq('repertorio_id', repertorioId);

  const { error } = await supabase
    .from('repertorio_ritos')
    .insert({ repertorio_id: repertorioId, nome: nomeFinal, ordem: count ?? 0 });

  if (error) console.error('adicionarRito:', error.message);
}

export async function removerRito(repertorioId: string, nome: string): Promise<void> {
  if (!isSupabaseConfigured) {
    salvarMock(
      lerMock().map((r) =>
        r.id === repertorioId ? { ...r, ritos: r.ritos.filter((n) => n !== nome) } : r
      )
    );
    return;
  }

  const { error } = await supabase
    .from('repertorio_ritos')
    .delete()
    .eq('repertorio_id', repertorioId)
    .eq('nome', nome);

  if (error) console.error('removerRito:', error.message);
}

// ---------- Músicas dentro do repertório ----------

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

/** Move uma música pra outro rito dentro do mesmo repertório. */
export async function moverMusicaParaRito(
  repertorioId: string,
  musicaId: string,
  novoRito: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    salvarMock(
      lerMock().map((r) =>
        r.id === repertorioId
          ? {
              ...r,
              itens: r.itens.map((i) =>
                i.musicaId === musicaId ? { ...i, momento: novoRito } : i
              ),
            }
          : r
      )
    );
    return;
  }

  const { error } = await supabase
    .from('repertorio_musicas')
    .update({ momento: novoRito })
    .eq('repertorio_id', repertorioId)
    .eq('musica_id', musicaId);

  if (error) console.error('moverMusicaParaRito:', error.message);
}

/** Nome do rito padrão sugerido pra uma música nova, a partir da tag dela. */
export function ritoSugeridoParaMomento(momentoMusica: string | null): string {
  if (!momentoMusica) return RITO_SEM_SECAO;
  return LABEL_MOMENTO[momentoMusica as keyof typeof LABEL_MOMENTO] ?? momentoMusica;
}
