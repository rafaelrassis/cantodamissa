import type { MomentoMissa } from '../types/musica';

const STORAGE_KEY = 'repertorios:v1';

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
  itens: ItemRepertorio[];
}

function gerarId(): string {
  return `rep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ler(): Repertorio[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function salvar(lista: Repertorio[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

export function listarRepertorios(): Repertorio[] {
  return ler().sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export function obterRepertorio(id: string): Repertorio | null {
  return ler().find((r) => r.id === id) ?? null;
}

export function criarRepertorio(nome: string): Repertorio {
  const novo: Repertorio = {
    id: gerarId(),
    nome: nome.trim() || 'Repertório sem nome',
    criadoEm: new Date().toISOString(),
    itens: [],
  };
  salvar([...ler(), novo]);
  return novo;
}

export function renomearRepertorio(id: string, nome: string): void {
  salvar(ler().map((r) => (r.id === id ? { ...r, nome: nome.trim() || r.nome } : r)));
}

export function removerRepertorio(id: string): void {
  salvar(ler().filter((r) => r.id !== id));
}

export function adicionarMusica(repertorioId: string, item: ItemRepertorio): void {
  salvar(
    ler().map((r) => {
      if (r.id !== repertorioId) return r;
      if (r.itens.some((i) => i.musicaId === item.musicaId)) return r; // já está lá
      return { ...r, itens: [...r.itens, item] };
    })
  );
}

export function removerMusica(repertorioId: string, musicaId: string): void {
  salvar(
    ler().map((r) =>
      r.id === repertorioId
        ? { ...r, itens: r.itens.filter((i) => i.musicaId !== musicaId) }
        : r
    )
  );
}

export function reordenarMusicas(repertorioId: string, musicaIds: string[]): void {
  salvar(
    ler().map((r) => {
      if (r.id !== repertorioId) return r;
      const porId = new Map(r.itens.map((i) => [i.musicaId, i]));
      const reordenados = musicaIds.map((id) => porId.get(id)).filter((i): i is ItemRepertorio => !!i);
      return { ...r, itens: reordenados };
    })
  );
}
