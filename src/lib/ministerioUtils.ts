// Helpers do módulo Ministério que não são dados mockados — datas, junção
// roteiro+músicas e paleta de cores fixa da UI. Antes viviam junto com os
// dados fake em mockMinisterio.ts; separados aqui depois que
// membros/escalas/avisos/indisponibilidades passaram a vir do Supabase
// (ver useMinisterio.ts, useEscalas.ts, useAvisos.ts, useIndisponibilidades.ts).

import type { ItemRoteiro } from '../types/ministerio';
import type { Repertorio } from './repertorios';

// Opções estáticas pra "Paleta de cores" da escala — reaproveita a
// identidade visual já definida (verde da marca + cores litúrgicas).
export const PALETAS_CORES: { id: string; nome: string; cor: string }[] = [
  { id: 'verde', nome: 'Verde', cor: '#186420' },
  { id: 'dourado', nome: 'Dourado', cor: '#c9a227' },
  { id: 'roxo', nome: 'Roxo litúrgico', cor: '#5b2d90' },
  { id: 'vermelho', nome: 'Vermelho', cor: '#a3111d' },
  { id: 'azul', nome: 'Azul', cor: '#2563eb' },
];

export function formatarDataLonga(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

export function formatarDataCurta(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/**
 * Junta os itens manuais do roteiro (tipo 'evento', persistidos em
 * roteiro_itens) com as músicas do Repertorio vinculado à escala,
 * exibidas como itens tipo 'musica' — elas não ficam duplicadas no banco,
 * são derivadas aqui na hora de renderizar. `repertorio` é null enquanto
 * ele ainda não existe (escala em rascunho, antes de salvar).
 */
export function itensRoteiroComMusicas(roteiro: ItemRoteiro[], repertorio: Repertorio | null): ItemRoteiro[] {
  const eventos = roteiro.filter((r) => (r.tipo ?? 'evento') !== 'musica');
  const musicas: ItemRoteiro[] = (repertorio?.itens ?? []).map((item, i) => ({
    id: `rm-${item.musicaId}-${i}`,
    tipo: 'musica',
    titulo: item.title,
    musicaId: item.musicaId,
    tom: item.tone,
    momento: item.momento ?? undefined,
  }));
  return [...eventos, ...musicas];
}
