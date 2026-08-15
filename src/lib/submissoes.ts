import { supabase, isSupabaseConfigured } from './supabase';
import { garantirSessaoAnonima } from './supabaseAuth';
import { exigirLinha } from './supabaseUtils';

/**
 * Sugestões da comunidade: música nova ou correção de uma cifra existente.
 *
 * Antes isso vivia inteiro em localStorage, o que quebrava justamente o
 * ponto da feature: a tela de moderação do admin só enxergava o que tinha
 * sido enviado no navegador dele, então nenhuma sugestão de usuário real
 * chegava a ser lida. Agora vai pra tabela `submissoes` (ver
 * 0012_admin_real_catalogo.sql), com fallback local só pra quando o
 * Supabase não estiver configurado — mesmo padrão do musicasApi.ts.
 */

const STORAGE_KEY = 'submissoes:v1';

export type StatusSubmissao = 'pendente' | 'aprovada' | 'rejeitada';
export type TipoSubmissao = 'nova' | 'correcao';

export interface Submissao {
  id: string;
  tipo: TipoSubmissao;
  status: StatusSubmissao;
  criadoEm: string; // ISO
  autorNome: string;
  musicaOriginalId?: string; // presente quando tipo === 'correcao'
  title: string;
  artist: string;
  originalTone: string;
  chordsContent: string;
  observacao?: string; // ex: "corrigi o acorde do refrão"
}

export type DadosSubmissao = Omit<Submissao, 'id' | 'status' | 'criadoEm'>;

type LinhaSubmissao = {
  id: string;
  tipo: TipoSubmissao;
  status: StatusSubmissao;
  criado_em: string;
  autor_nome: string;
  musica_original_id: string | null;
  title: string;
  artist: string;
  original_tone: string;
  chords_content: string;
  observacao: string;
};

function mapear(row: LinhaSubmissao): Submissao {
  return {
    id: row.id,
    tipo: row.tipo,
    status: row.status,
    criadoEm: row.criado_em,
    autorNome: row.autor_nome,
    musicaOriginalId: row.musica_original_id ?? undefined,
    title: row.title,
    artist: row.artist,
    originalTone: row.original_tone,
    chordsContent: row.chords_content,
    observacao: row.observacao || undefined,
  };
}

// ---------- Fallback local (sem Supabase configurado) ----------

function gerarId(): string {
  return `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function lerLocal(): Submissao[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function salvarLocal(lista: Submissao[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

// ---------- API pública ----------

export async function listarSubmissoes(): Promise<Submissao[]> {
  if (!isSupabaseConfigured) {
    return lerLocal().sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }

  // A policy decide o que aparece: admin vê tudo, autor vê as próprias,
  // e as aprovadas são públicas (viram crédito na tela da cifra).
  const { data, error } = await supabase
    .from('submissoes')
    .select('*')
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('listarSubmissoes:', error.message);
    return [];
  }
  return ((data ?? []) as LinhaSubmissao[]).map(mapear);
}

export async function criarSubmissao(dados: DadosSubmissao): Promise<Submissao> {
  if (!isSupabaseConfigured) {
    const nova: Submissao = {
      ...dados,
      id: gerarId(),
      status: 'pendente',
      criadoEm: new Date().toISOString(),
    };
    salvarLocal([...lerLocal(), nova]);
    return nova;
  }

  const authUid = await garantirSessaoAnonima();
  if (!authUid) throw new Error('criarSubmissao: sessão indisponível');

  const linha = await exigirLinha<LinhaSubmissao>(
    supabase
      .from('submissoes')
      .insert({
        tipo: dados.tipo,
        autor_nome: dados.autorNome,
        autor_auth_uid: authUid,
        musica_original_id: dados.musicaOriginalId ?? null,
        title: dados.title,
        artist: dados.artist,
        original_tone: dados.originalTone,
        chords_content: dados.chordsContent,
        observacao: dados.observacao ?? '',
      })
      .select('*'),
    'criarSubmissao'
  );
  return mapear(linha);
}

export async function atualizarStatus(id: string, status: StatusSubmissao): Promise<void> {
  if (!isSupabaseConfigured) {
    salvarLocal(lerLocal().map((s) => (s.id === id ? { ...s, status } : s)));
    return;
  }
  await exigirLinha(
    supabase.from('submissoes').update({ status }).eq('id', id).select('id'),
    'atualizarStatus'
  );
}

export async function removerSubmissao(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    salvarLocal(lerLocal().filter((s) => s.id !== id));
    return;
  }
  await exigirLinha(
    supabase.from('submissoes').delete().eq('id', id).select('id'),
    'removerSubmissao'
  );
}
