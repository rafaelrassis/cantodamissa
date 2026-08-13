import { useCallback, useEffect, useState } from 'react';
import { listarProximasEscalasDoMembro, type EscalaResumo } from './escalasApi';
import { listarRepertoriosPorEscalas } from './repertorios';

export interface ProximoRepertorioItem {
  escala: EscalaResumo;
  repertorioId: string;
}

/**
 * Busca só o necessário pro card da Início: escalas futuras do membro
 * (sem roteiro_itens) + repertorios correspondentes (sem ritos/músicas).
 * Ver escalasApi.listarProximasEscalasDoMembro e
 * repertorios.listarRepertoriosPorEscalas — evita o custo de
 * useEscalas()+useRepertorios() completos só pra montar uma lista de 0-5
 * itens.
 */
export function useProximosRepertoriosHome(
  ministerioId: string | null,
  meuMembroId: string | null,
  qtd: number
) {
  const [itens, setItens] = useState<ProximoRepertorioItem[]>([]);
  const [carregando, setCarregando] = useState(false);

  const recarregar = useCallback(async () => {
    if (!ministerioId || !meuMembroId || qtd === 0) {
      setItens([]);
      return;
    }
    setCarregando(true);
    try {
      const escalas = await listarProximasEscalasDoMembro(ministerioId, meuMembroId, qtd);
      if (escalas.length === 0) {
        setItens([]);
        return;
      }
      const repertorios = await listarRepertoriosPorEscalas(escalas.map((e) => e.id));
      const repertorioIdPorEscala = new Map(repertorios.map((r) => [r.escalaId, r.id]));
      const proximos = escalas
        .map((escala) => {
          const repertorioId = repertorioIdPorEscala.get(escala.id);
          return repertorioId ? { escala, repertorioId } : null;
        })
        .filter((x): x is ProximoRepertorioItem => x !== null);
      setItens(proximos);
    } catch (e) {
      console.error('useProximosRepertoriosHome:', e);
      setItens([]);
    } finally {
      setCarregando(false);
    }
  }, [ministerioId, meuMembroId, qtd]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { itens, carregando };
}
