import { useEffect, useState } from 'react';

/**
 * Devolve o valor só depois que ele para de mudar por `atrasoMs`.
 *
 * Usado na busca: cada tecla digitada disparava uma consulta full-text no
 * Supabase, e as respostas voltavam fora de ordem — além do gasto, dava
 * pra ver o resultado de um prefixo antigo piscando sobre o atual.
 */
export function useDebounce<T>(valor: T, atrasoMs = 300): T {
  const [valorAtrasado, setValorAtrasado] = useState(valor);

  useEffect(() => {
    const id = setTimeout(() => setValorAtrasado(valor), atrasoMs);
    return () => clearTimeout(id);
  }, [valor, atrasoMs]);

  return valorAtrasado;
}
