import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ErroContext } from './erroContext';
import { mensagemDeErro } from './supabaseUtils';
import { capturarErro } from './sentry';

export function ErroProvider({ children }: { children: ReactNode }) {
  const [erro, setErro] = useState<string | null>(null);

  const reportar = useCallback((err: unknown, padrao?: string) => {
    console.error(err);
    capturarErro(err instanceof Error ? err : new Error(String(err)), { padrao });
    setErro(mensagemDeErro(err, padrao));
  }, []);

  const limpar = useCallback(() => setErro(null), []);

  const valor = useMemo(() => ({ erro, reportar, limpar }), [erro, reportar, limpar]);

  return <ErroContext.Provider value={valor}>{children}</ErroContext.Provider>;
}
