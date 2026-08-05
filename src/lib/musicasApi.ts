import type { Musica, MomentoMissa, TempoLiturgico } from '../types/musica';
import { mockMusicas } from './mockMusicas';

/**
 * Camada de acesso a dados. Por enquanto usa `mockMusicas` (sem Supabase real
 * conectado ainda). A assinatura das funções já reflete o que a query real
 * no Supabase vai fazer, então trocar o corpo por `supabase.from('musicas')...`
 * não deve exigir mudança nos componentes que consomem isso.
 */

export interface FiltroMusicas {
  tempo?: TempoLiturgico;
  momento?: MomentoMissa;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove acentos
}

export async function getMusicaById(id: string): Promise<Musica | null> {
  return mockMusicas.find((m) => m.id === id) ?? null;
}

export async function getTop50(filtro: FiltroMusicas = {}): Promise<Musica[]> {
  let lista = [...mockMusicas];
  if (filtro.tempo) lista = lista.filter((m) => m.tempoLiturgico.includes(filtro.tempo!));
  if (filtro.momento) lista = lista.filter((m) => m.momento.includes(filtro.momento!));
  return lista.sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 50);
}

export async function searchMusicas(
  query: string,
  filtro: FiltroMusicas = {}
): Promise<Musica[]> {
  const termo = normalizar(query.trim());
  let lista = [...mockMusicas];

  if (filtro.tempo) lista = lista.filter((m) => m.tempoLiturgico.includes(filtro.tempo!));
  if (filtro.momento) lista = lista.filter((m) => m.momento.includes(filtro.momento!));

  if (!termo) return lista.sort((a, b) => b.viewsCount - a.viewsCount);

  return lista
    .filter((m) => {
      const alvo = normalizar(`${m.title} ${m.artist ?? ''}`);
      return alvo.includes(termo);
    })
    .sort((a, b) => b.viewsCount - a.viewsCount);
}
