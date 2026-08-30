import { useCallback, useState } from 'react';
import type { ModoExibicao } from './modoExibicao';

/**
 * Modo de exibição padrão (cifra ou letra) pra músicas sem preferência
 * própria salva ainda — configurável em Personalizar. Guardado por
 * dispositivo (mesmo padrão de qtdRepertoriosHome), padrão 'cifra' pra
 * usuários novos. Não afeta o repertório público da assembleia, que
 * sempre força 'letra' (abaInicial fixo em App.tsx).
 */
const CHAVE = 'cdm_modo_exibicao_padrao:v1';
const PADRAO: ModoExibicao = 'cifra';

export function getModoExibicaoPadrao(): ModoExibicao {
  const raw = localStorage.getItem(CHAVE);
  return raw === 'letra' ? 'letra' : PADRAO;
}

export function setModoExibicaoPadrao(modo: ModoExibicao): void {
  localStorage.setItem(CHAVE, modo);
}

export function useModoExibicaoPadrao() {
  const [modo, setModo] = useState(getModoExibicaoPadrao);

  const definir = useCallback((m: ModoExibicao) => {
    setModoExibicaoPadrao(m);
    setModo(getModoExibicaoPadrao());
  }, []);

  return [modo, definir] as const;
}
