const STORAGE_KEY = 'submissoes:v1';

export type StatusSubmissao = 'pendente' | 'aprovada' | 'rejeitada';
export type TipoSubmissao = 'nova' | 'correcao';

export interface Submissao {
  id: string;
  tipo: TipoSubmissao;
  status: StatusSubmissao;
  criadoEm: string; // ISO
  autorNome: string; // texto livre por enquanto — sem auth ainda
  musicaOriginalId?: string; // presente quando tipo === 'correcao'
  title: string;
  artist: string;
  originalTone: string;
  chordsContent: string;
  observacao?: string; // ex: "corrigi o acorde do refrão"
}

function gerarId(): string {
  return `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ler(): Submissao[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function salvar(lista: Submissao[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

export function listarSubmissoes(): Submissao[] {
  return ler().sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export function criarSubmissao(
  dados: Omit<Submissao, 'id' | 'status' | 'criadoEm'>
): Submissao {
  const nova: Submissao = {
    ...dados,
    id: gerarId(),
    status: 'pendente',
    criadoEm: new Date().toISOString(),
  };
  salvar([...ler(), nova]);
  return nova;
}

export function atualizarStatus(id: string, status: StatusSubmissao): void {
  salvar(ler().map((s) => (s.id === id ? { ...s, status } : s)));
}

export function removerSubmissao(id: string): void {
  salvar(ler().filter((s) => s.id !== id));
}
