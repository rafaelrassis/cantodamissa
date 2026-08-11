// Dados fake em memória (não persiste, reseta ao recarregar) — objetivo é
// só validar o fluxo/UX do módulo Ministério antes de desenhar as tabelas
// reais no Supabase. Nada aqui toca em src/lib/supabase.ts ou em rede.

import type {
  Aviso,
  Escala,
  FuncaoMinisterio,
  Indisponibilidade,
  ItemRoteiro,
  MembroMinisterio,
} from '../types/ministerio';
import { mockMusicas } from './mockMusicas';

export const FUNCOES: FuncaoMinisterio[] = [
  { id: 'ministro', nome: 'Ministro', icone: '🎤' },
  { id: 'vocalista', nome: 'Vocalista', icone: '🎙️' },
  { id: 'backing', nome: 'Backing vocal', icone: '🎶' },
  { id: 'baixo', nome: 'Baixo', icone: '🎸' },
  { id: 'violao', nome: 'Violão', icone: '🪕' },
  { id: 'teclado', nome: 'Teclado', icone: '🎹' },
  { id: 'guitarra', nome: 'Guitarra', icone: '🎸' },
  { id: 'piano', nome: 'Piano', icone: '🎹' },
  { id: 'bateria', nome: 'Bateria', icone: '🥁' },
  { id: 'percussao', nome: 'Percussão', icone: '🪘' },
  { id: 'som', nome: 'Mesa de som', icone: '🎚️' },
];

export const MEMBROS: MembroMinisterio[] = [
  { id: 'm1', nome: 'Rafael Rodrigues', avatarCor: 'bg-teal-500', funcoes: ['violao', 'ministro'], admin: true, aniversario: '1990-08-15' },
  { id: 'm2', nome: 'Ana Beatriz', avatarCor: 'bg-rose-500', funcoes: ['vocalista'], aniversario: '1995-03-02' },
  { id: 'm3', nome: 'João Pedro', avatarCor: 'bg-indigo-500', funcoes: ['teclado'], aniversario: '1988-08-05' },
  { id: 'm4', nome: 'Camila Souza', avatarCor: 'bg-amber-500', funcoes: ['backing'], aniversario: '1999-11-20' },
  { id: 'm5', nome: 'Lucas Martins', avatarCor: 'bg-emerald-500', funcoes: ['bateria', 'som'], aniversario: '2000-08-28' },
];

// Opções estáticas pra "Paleta de cores" da escala — reaproveita a
// identidade visual já definida (verde da marca + cores litúrgicas),
// sem introduzir paleta nova.
export const PALETAS_CORES: { id: string; nome: string; cor: string }[] = [
  { id: 'verde', nome: 'Verde', cor: '#186420' },
  { id: 'dourado', nome: 'Dourado', cor: '#c9a227' },
  { id: 'roxo', nome: 'Roxo litúrgico', cor: '#5b2d90' },
  { id: 'vermelho', nome: 'Vermelho', cor: '#a3111d' },
  { id: 'azul', nome: 'Azul', cor: '#2563eb' },
];

// ids de música batendo com o mock/seed já usado no restante do app
// ("Bondade de Deus" aparece nos prints de referência do LouveApp).
export const ESCALAS: Escala[] = [
  {
    id: 'e1',
    titulo: 'Missa Dominical 19h',
    data: proximoDomingoISO(0),
    hora: '19:00',
    observacoes: 'Chegar 30min antes para passagem de som.',
    publicada: true,
    solicitarConfirmacao: true,
    participantes: [
      { membroId: 'm1', funcaoId: 'violao', status: 'confirmado' },
      { membroId: 'm2', funcaoId: 'vocalista', status: 'confirmado' },
      { membroId: 'm3', funcaoId: 'teclado', status: 'pendente' },
      { membroId: 'm5', funcaoId: 'som', status: 'pendente' },
    ],
    musicas: [
      { musicaId: 'bondade-de-deus', tom: 'D', momento: 'Entrada' },
      { musicaId: 'bondade-de-deus', tom: 'G', momento: 'Comunhão' },
    ],
    roteiro: [
      { id: 'r1', tipo: 'evento', titulo: 'Passagem de som', icone: '🔊', descricao: '18:30' },
      { id: 'r2', tipo: 'evento', titulo: 'Início da missa', icone: '⛪', descricao: '19:00' },
    ],
  },
  {
    id: 'e2',
    titulo: 'Missa Dominical 19h',
    data: proximoDomingoISO(7),
    hora: '19:00',
    observacoes: '',
    publicada: false,
    solicitarConfirmacao: true,
    participantes: [
      { membroId: 'm1', funcaoId: 'ministro', status: 'confirmado' },
      { membroId: 'm4', funcaoId: 'backing', status: 'pendente' },
    ],
    musicas: [{ musicaId: 'bondade-de-deus', tom: 'D', momento: 'Entrada' }],
    roteiro: [],
  },
  {
    id: 'e3',
    titulo: 'Missa Dominical 19h',
    data: proximoDomingoISO(-7),
    hora: '19:00',
    observacoes: '',
    publicada: true,
    solicitarConfirmacao: false,
    participantes: [
      { membroId: 'm1', funcaoId: 'violao', status: 'confirmado' },
      { membroId: 'm2', funcaoId: 'vocalista', status: 'confirmado' },
      { membroId: 'm5', funcaoId: 'bateria', status: 'recusado' },
    ],
    musicas: [{ musicaId: 'bondade-de-deus', tom: 'D', momento: 'Entrada' }],
    roteiro: [],
  },
];

export const INDISPONIBILIDADES: Indisponibilidade[] = [
  { id: 'i1', membroId: 'm3', data: proximoDomingoISO(7), motivo: 'Viagem' },
];

export const AVISOS: Aviso[] = [
  {
    id: 'a1',
    titulo: 'Ensaio extra sexta-feira',
    descricao: 'Vamos ensaiar as músicas novas às 20h na sala de música.',
    emDestaque: true,
    arquivado: false,
    criadoEm: new Date().toISOString(),
  },
  {
    id: 'a2',
    titulo: 'Troca de uniforme',
    descricao: 'A partir do próximo mês, usar camisa azul-marinho nas missas.',
    emDestaque: false,
    arquivado: false,
    criadoEm: new Date().toISOString(),
  },
];

export const CODIGO_CONVITE = 'CDM-4F2K';

function proximoDomingoISO(offsetDias: number): string {
  const hoje = new Date();
  const diaSemana = hoje.getDay();
  const diasAteDomingo = (7 - diaSemana) % 7 || 7;
  const alvo = new Date(hoje);
  alvo.setDate(hoje.getDate() + diasAteDomingo + offsetDias);
  return alvo.toISOString().slice(0, 10);
}

export function formatarDataLonga(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

export function tituloMusica(musicaId: string): string {
  return mockMusicas.find((m) => m.id === musicaId || m.slug === musicaId)?.title ?? 'Música';
}

/**
 * Junta os itens manuais do roteiro (tipo 'evento') com as músicas da
 * escala, exibidas como itens tipo 'musica' — elas não ficam duplicadas
 * no estado, são derivadas aqui na hora de renderizar (ver aviso na aba
 * Roteiro: "adicionadas automaticamente com base na seleção em Músicas").
 */
export function itensRoteiroComMusicas(escala: Pick<Escala, 'roteiro' | 'musicas'>): ItemRoteiro[] {
  const eventos = escala.roteiro.filter((r) => (r.tipo ?? 'evento') !== 'musica');
  const musicas: ItemRoteiro[] = escala.musicas.map((m, i) => ({
    id: `rm-${m.musicaId}-${i}`,
    tipo: 'musica',
    titulo: tituloMusica(m.musicaId),
    musicaId: m.musicaId,
    tom: m.tom,
    momento: m.momento,
  }));
  return [...eventos, ...musicas];
}

export function formatarDataCurta(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
