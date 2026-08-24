import { supabase, isSupabaseConfigured } from './supabase';
import { garantirSessaoAnonima } from './supabaseAuth';
import { exigirLinha } from './supabaseUtils';
import { LABEL_MOMENTO } from './labels';

/**
 * Repertórios: usa Supabase (tabelas `repertorios`, `repertorio_musicas`,
 * `repertorio_ritos`) quando configurado, com fallback pra localStorage
 * caso contrário — mesmo padrão do musicasApi.ts.
 *
 * O dono de um repertório é o auth.uid() da sessão do Supabase (anônima
 * por dispositivo, ou a conta Google) — verificável pelas policies porque
 * vem assinado no JWT. A `device_key` continua gravada só pra reivindicar
 * repertórios criados antes disso (ver reivindicarRepertoriosDoDevice e
 * a migration 0014_repertorios_dono_real.sql).
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
  escalaId: string | null; // vínculo com a Escala do Ministério que o criou
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

/**
 * Assume a posse dos repertórios criados por este aparelho antes de
 * existir auth_uid — sem isso eles ficariam invisíveis pro próprio dono
 * depois da migration 0014. Roda uma vez por sessão.
 */
let reivindicacaoFeita: Promise<void> | null = null;
export function reivindicarRepertoriosDoDevice(): Promise<void> {
  if (!isSupabaseConfigured) return Promise.resolve();
  if (!reivindicacaoFeita) {
    reivindicacaoFeita = (async () => {
      await garantirSessaoAnonima();
      const { error } = await supabase.rpc('reivindicar_repertorios_do_device', {
        p_device_key: getDeviceKey(),
      });
      if (error) {
        console.error('reivindicarRepertoriosDoDevice:', error.message);
        reivindicacaoFeita = null; // permite tentar de novo
      }
    })();
  }
  return reivindicacaoFeita;
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

export interface LinhaRepertorioSupabase {
  id: string;
  nome: string;
  created_at: string;
  share_token: string | null;
  escala_id: string | null;
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
  'id, nome, created_at, share_token, escala_id, ' +
  'repertorio_ritos(nome, ordem), ' +
  'repertorio_musicas(musica_id, momento, tom_escolhido, ordem, musicas(title, artist, original_tone))';

export function mapearRepertorio(row: LinhaRepertorioSupabase): Repertorio {
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
    escalaId: row.escala_id,
    ritos,
    itens,
  };
}

// ---------- API pública ----------

export async function listarRepertorios(): Promise<Repertorio[]> {
  if (!isSupabaseConfigured) {
    return lerMock().sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }

  await reivindicarRepertoriosDoDevice();

  // Sem filtro por dono aqui de propósito: a policy de select já limita ao
  // que é meu (ou ao repertório da escala de um ministério que eu integro).
  const { data, error } = await supabase
    .from('repertorios')
    .select(SELECT_REPERTORIO)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('listarRepertorios:', error.message);
    return [];
  }
  return ((data ?? []) as unknown as LinhaRepertorioSupabase[]).map(mapearRepertorio);
}

/**
 * Abre um repertório compartilhado por link. Vai por RPC porque quem
 * recebeu o link não é dono nem membro do ministério: a policy de select
 * não deixa ele ler a linha, e afrouxá-la pra isso reabriria a listagem de
 * todos os repertórios (ver 0014_repertorios_dono_real.sql).
 */
export async function obterRepertorioPorToken(token: string): Promise<Repertorio | null> {
  if (!isSupabaseConfigured) return null; // compartilhamento por link exige backend real

  const { data, error } = await supabase.rpc('repertorio_por_token', { p_token: token });

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

export async function criarRepertorio(nome: string, escalaId: string | null = null): Promise<Repertorio> {
  const nomeFinal = nome.trim() || 'Repertório sem nome';

  if (!isSupabaseConfigured) {
    const novo: Repertorio = {
      id: gerarIdMock(),
      nome: nomeFinal,
      criadoEm: new Date().toISOString(),
      shareToken: null,
      escalaId,
      ritos: [...RITOS_PADRAO],
      itens: [],
    };
    salvarMock([...lerMock(), novo]);
    return novo;
  }

  const authUid = await garantirSessaoAnonima();
  if (!authUid) throw new Error('criarRepertorio: sessão indisponível');

  const { data, error } = await supabase
    .from('repertorios')
    .insert({ nome: nomeFinal, device_key: getDeviceKey(), auth_uid: authUid, escala_id: escalaId })
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

/** Busca o repertório já vinculado a uma escala (1 escala = 1 repertório). */
export async function obterRepertorioPorEscala(escalaId: string): Promise<Repertorio | null> {
  if (!isSupabaseConfigured) {
    return lerMock().find((r) => r.escalaId === escalaId) ?? null;
  }

  const { data, error } = await supabase
    .from('repertorios')
    .select(SELECT_REPERTORIO)
    .eq('escala_id', escalaId)
    .maybeSingle();

  if (error) {
    console.error('obterRepertorioPorEscala:', error.message);
    return null;
  }
  return data ? mapearRepertorio(data as unknown as LinhaRepertorioSupabase) : null;
}

export type RepertorioResumo = { id: string; escalaId: string };

/**
 * Versão leve pro card "Meus próximos repertórios" da Início: só id +
 * escalaId (sem ritos/músicas), buscando apenas os repertórios das
 * escalas já filtradas — em vez de listarRepertorios() completo, que traz
 * ritos e músicas de TODOS os repertórios do dispositivo.
 */
export async function listarRepertoriosPorEscalas(escalaIds: string[]): Promise<RepertorioResumo[]> {
  if (escalaIds.length === 0) return [];

  if (!isSupabaseConfigured) {
    return lerMock()
      .filter((r) => r.escalaId && escalaIds.includes(r.escalaId))
      .map((r) => ({ id: r.id, escalaId: r.escalaId as string }));
  }

  const { data, error } = await supabase.from('repertorios').select('id, escala_id').in('escala_id', escalaIds);
  if (error) {
    console.error('listarRepertoriosPorEscalas:', error.message);
    return [];
  }
  return (data ?? []).map((r) => ({ id: r.id as string, escalaId: r.escala_id as string }));
}

export async function renomearRepertorio(id: string, nome: string): Promise<void> {
  const nomeFinal = nome.trim();
  if (!nomeFinal) return;

  if (!isSupabaseConfigured) {
    salvarMock(lerMock().map((r) => (r.id === id ? { ...r, nome: nomeFinal } : r)));
    return;
  }

  await exigirLinha(
    supabase.from('repertorios').update({ nome: nomeFinal }).eq('id', id).select('id'),
    'renomearRepertorio'
  );
}

export async function removerRepertorio(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    salvarMock(lerMock().filter((r) => r.id !== id));
    return;
  }

  await exigirLinha(
    supabase.from('repertorios').delete().eq('id', id).select('id'),
    'removerRepertorio'
  );
}

/** Cria uma cópia independente de um repertório — mesmos ritos e músicas,
 * nome sufixado " (cópia)", sem share_token nem escalaId próprios (link e
 * vínculo com escala não são herdados — a cópia nasce solta). */
export async function duplicarRepertorio(id: string): Promise<Repertorio> {
  const original = await obterRepertorio(id);
  if (!original) throw new Error('duplicarRepertorio: repertório original não encontrado');
  const nomeCopia = `${original.nome} (cópia)`;

  if (!isSupabaseConfigured) {
    const novo: Repertorio = {
      id: gerarIdMock(),
      nome: nomeCopia,
      criadoEm: new Date().toISOString(),
      shareToken: null,
      escalaId: null,
      ritos: [...original.ritos],
      itens: original.itens.map((i) => ({ ...i })),
    };
    salvarMock([...lerMock(), novo]);
    return novo;
  }

  const authUid = await garantirSessaoAnonima();
  if (!authUid) throw new Error('duplicarRepertorio: sessão indisponível');

  const { data, error } = await supabase
    .from('repertorios')
    .insert({ nome: nomeCopia, device_key: getDeviceKey(), auth_uid: authUid })
    .select('id')
    .single();
  if (error) throw new Error(`duplicarRepertorio: ${error.message}`);

  if (original.ritos.length > 0) {
    const { error: errorRitos } = await supabase
      .from('repertorio_ritos')
      .insert(original.ritos.map((nome, ordem) => ({ repertorio_id: data.id, nome, ordem })));
    if (errorRitos) console.error('duplicarRepertorio (ritos):', errorRitos.message);
  }

  if (original.itens.length > 0) {
    const { error: errorMusicas } = await supabase.from('repertorio_musicas').insert(
      original.itens.map((item, ordem) => ({
        repertorio_id: data.id,
        musica_id: item.musicaId,
        momento: item.momento,
        tom_escolhido: item.tone,
        ordem,
      }))
    );
    if (errorMusicas) console.error('duplicarRepertorio (músicas):', errorMusicas.message);
  }

  const criado = await obterRepertorio(data.id);
  if (!criado) throw new Error('duplicarRepertorio: falha ao recarregar após duplicar');
  return criado;
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

  await exigirLinha(
    supabase
      .from('repertorio_ritos')
      .insert({ repertorio_id: repertorioId, nome: nomeFinal, ordem: await proximaOrdem('repertorio_ritos', repertorioId) })
      .select('id'),
    'adicionarRito'
  );
}

/**
 * Próxima posição livre numa lista ordenada do repertório. Usa o maior
 * `ordem` existente em vez da contagem de linhas: depois de remover um
 * item do meio, contar daria um número já ocupado e dois itens
 * empatariam na ordenação.
 */
async function proximaOrdem(
  tabela: 'repertorio_ritos' | 'repertorio_musicas',
  repertorioId: string
): Promise<number> {
  const { data } = await supabase
    .from(tabela)
    .select('ordem')
    .eq('repertorio_id', repertorioId)
    .order('ordem', { ascending: false })
    .limit(1);
  const maior = (data ?? [])[0]?.ordem;
  return typeof maior === 'number' ? maior + 1 : 0;
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

  await exigirLinha(
    supabase
      .from('repertorio_ritos')
      .delete()
      .eq('repertorio_id', repertorioId)
      .eq('nome', nome)
      .select('id'),
    'removerRito'
  );
}

/** Reordena os ritos de um repertório pra bater com a ordem do array dado. */
export async function reordenarRitos(repertorioId: string, nomesOrdenados: string[]): Promise<void> {
  if (!isSupabaseConfigured) {
    salvarMock(
      lerMock().map((r) => (r.id === repertorioId ? { ...r, ritos: nomesOrdenados } : r))
    );
    return;
  }

  // atualiza a `ordem` de cada rito uma a uma (poucos itens, sem necessidade
  // de query em lote)
  await Promise.all(
    nomesOrdenados.map((nome, ordem) =>
      supabase
        .from('repertorio_ritos')
        .update({ ordem })
        .eq('repertorio_id', repertorioId)
        .eq('nome', nome)
    )
  );
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

  const { error } = await supabase.from('repertorio_musicas').insert({
    repertorio_id: repertorioId,
    musica_id: item.musicaId,
    momento: item.momento,
    tom_escolhido: item.tone,
    ordem: await proximaOrdem('repertorio_musicas', repertorioId),
  });

  // conflito de chave primária (repertorio_id, musica_id) = música já está lá — ignora
  if (error && !error.message.includes('duplicate')) {
    throw new Error(`adicionarMusica: ${error.message}`);
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

  await exigirLinha(
    supabase
      .from('repertorio_musicas')
      .delete()
      .eq('repertorio_id', repertorioId)
      .eq('musica_id', musicaId)
      .select('musica_id'),
    'removerMusica'
  );
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

  await exigirLinha(
    supabase
      .from('repertorio_musicas')
      .update({ momento: novoRito })
      .eq('repertorio_id', repertorioId)
      .eq('musica_id', musicaId)
      .select('musica_id'),
    'moverMusicaParaRito'
  );
}

/** Nome do rito padrão sugerido pra uma música nova, a partir da tag dela. */
export function ritoSugeridoParaMomento(momentoMusica: string | null): string {
  if (!momentoMusica) return RITO_SEM_SECAO;
  return LABEL_MOMENTO[momentoMusica as keyof typeof LABEL_MOMENTO] ?? momentoMusica;
}
