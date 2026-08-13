import { useCallback, useState } from 'react';

/**
 * Quantos "meus próximos repertórios" mostrar no topo da Início — 0 (bloco
 * oculto) até 5. Guardado por dispositivo (mesmo padrão de device_key em
 * repertorios.ts), sem tabela própria por ora.
 */
const CHAVE = 'cdm_qtd_repertorios_home:v1';
const PADRAO = 3;
const MAXIMO = 5;

export function getQtdRepertoriosHome(): number {
  const raw = localStorage.getItem(CHAVE);
  if (raw === null) return PADRAO;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= MAXIMO ? n : PADRAO;
}

export function setQtdRepertoriosHome(qtd: number): void {
  localStorage.setItem(CHAVE, String(Math.max(0, Math.min(MAXIMO, Math.round(qtd)))));
}

export function useQtdRepertoriosHome() {
  const [qtd, setQtd] = useState(getQtdRepertoriosHome);

  const definir = useCallback((n: number) => {
    setQtdRepertoriosHome(n);
    setQtd(getQtdRepertoriosHome());
  }, []);

  return [qtd, definir] as const;
}
