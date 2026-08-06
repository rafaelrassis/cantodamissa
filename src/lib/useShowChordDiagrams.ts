import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'mostrar-diagramas-acorde';

function valorInicial(): boolean {
  const salvo = localStorage.getItem(STORAGE_KEY);
  return salvo === null ? false : salvo === '1';
}

/**
 * Preferência global de mostrar/ocultar diagramas de acorde no leitor —
 * persistida em localStorage, então vale pra qualquer música (não reseta
 * ao trocar de cifra, diferente do que era antes com useState local).
 */
export function useShowChordDiagrams() {
  const [show, setShow] = useState(valorInicial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, show ? '1' : '0');
  }, [show]);

  const toggle = useCallback(() => setShow((s) => !s), []);

  return { show, toggle };
}
