import { supabase, isSupabaseConfigured } from './supabase';
import { garantirSessaoAnonima } from './supabaseAuth';
import { exigirLinha } from './supabaseUtils';

/**
 * Pedidos de remoção (notice-and-takedown, ver SPEC.md seção 8 e
 * 0029_solicitacoes_remocao.sql). Mesmo padrão de fallback local de
 * submissoes.ts pra quando o Supabase não estiver configurado — sem
 * isso o botão "solicitar remoção" quebraria em dev sem `.env`.
 */

const STORAGE_KEY = 'solicitacoes-remocao:v1';

export type StatusSolicitacaoRemocao = 'pendente' | 'concluida' | 'rejeitada';
export type AlvoRemocao = 'musica' | 'cantor';

export interface SolicitacaoRemocao {
  id: string;
  status: StatusSolicitacaoRemocao;
  alvoTipo: AlvoRemocao;
  musicaId?: string;
  cantorId?: string;
  alvoDescricao: string;
  solicitanteNome: string;
  solicitanteEmail: string;
  motivo: string;
  respostaAdmin?: string;
  criadoEm: string; // ISO
}

export type DadosSolicitacaoRemocao = Omit<SolicitacaoRemocao, 'id' | 'status' | 'criadoEm' | 'respostaAdmin'>;

type LinhaSolicitacao = {
  id: string;
  status: StatusSolicitacaoRemocao;
  alvo_tipo: AlvoRemocao;
  musica_id: string | null;
  cantor_id: string | null;
  alvo_descricao: string;
  solicitante_nome: string;
  solicitante_email: string;
  motivo: string;
  resposta_admin: string;
  criado_em: string;
};

function mapear(row: LinhaSolicitacao): SolicitacaoRemocao {
  return {
    id: row.id,
    status: row.status,
    alvoTipo: row.alvo_tipo,
    musicaId: row.musica_id ?? undefined,
    cantorId: row.cantor_id ?? undefined,
    alvoDescricao: row.alvo_descricao,
    solicitanteNome: row.solicitante_nome,
    solicitanteEmail: row.solicitante_email,
    motivo: row.motivo,
    respostaAdmin: row.resposta_admin || undefined,
    criadoEm: row.criado_em,
  };
}

// ---------- Fallback local (sem Supabase configurado) ----------

function gerarId(): string {
  return `rem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function lerLocal(): SolicitacaoRemocao[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function salvarLocal(lista: SolicitacaoRemocao[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

// ---------- API pública ----------

export async function listarSolicitacoesRemocao(): Promise<SolicitacaoRemocao[]> {
  if (!isSupabaseConfigured) {
    return lerLocal().sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }

  // A policy só deixa admin ler (ver 0029): quem não é admin recebe []
  // em vez de erro, e a moderação nem chega a aparecer na UI de quem
  // não deveria vê-la.
  const { data, error } = await supabase
    .from('solicitacoes_remocao')
    .select('*')
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('listarSolicitacoesRemocao:', error.message);
    return [];
  }
  return ((data ?? []) as LinhaSolicitacao[]).map(mapear);
}

export async function criarSolicitacaoRemocao(
  dados: DadosSolicitacaoRemocao
): Promise<SolicitacaoRemocao> {
  if (!isSupabaseConfigured) {
    const nova: SolicitacaoRemocao = {
      ...dados,
      id: gerarId(),
      status: 'pendente',
      criadoEm: new Date().toISOString(),
    };
    salvarLocal([...lerLocal(), nova]);
    return nova;
  }

  const authUid = await garantirSessaoAnonima();
  if (!authUid) throw new Error('criarSolicitacaoRemocao: sessão indisponível');

  const linha = await exigirLinha<LinhaSolicitacao>(
    supabase
      .from('solicitacoes_remocao')
      .insert({
        alvo_tipo: dados.alvoTipo,
        musica_id: dados.musicaId ?? null,
        cantor_id: dados.cantorId ?? null,
        alvo_descricao: dados.alvoDescricao,
        solicitante_nome: dados.solicitanteNome,
        solicitante_email: dados.solicitanteEmail,
        motivo: dados.motivo,
        autor_auth_uid: authUid,
      })
      .select('*'),
    'criarSolicitacaoRemocao'
  );
  return mapear(linha);
}

export async function atualizarStatusSolicitacaoRemocao(
  id: string,
  status: StatusSolicitacaoRemocao,
  respostaAdmin = ''
): Promise<void> {
  if (!isSupabaseConfigured) {
    salvarLocal(
      lerLocal().map((s) => (s.id === id ? { ...s, status, respostaAdmin } : s))
    );
    return;
  }
  await exigirLinha(
    supabase
      .from('solicitacoes_remocao')
      .update({ status, resposta_admin: respostaAdmin })
      .eq('id', id)
      .select('id'),
    'atualizarStatusSolicitacaoRemocao'
  );
}
