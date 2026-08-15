import { createContext, useContext } from 'react';

/**
 * Canal único pra "a ação falhou" chegar até o usuário.
 *
 * Com RLS restrita, ser barrado virou um resultado normal (alguém deixou
 * de ser admin, a escala foi apagada por outra pessoa, a sessão expirou)
 * — e a camada de dados deixou de engolir esses erros. Sem um lugar pra
 * exibi-los, cada tela teria seu próprio estado de erro ou, pior, a
 * promessa rejeitada morreria no console e a tela ficaria só sem reagir.
 */
export type CanalErro = {
  erro: string | null;
  /** Registra a falha (aceita Error, ErroPermissao ou string). */
  reportar: (err: unknown, padrao?: string) => void;
  limpar: () => void;
};

export const ErroContext = createContext<CanalErro | null>(null);

export function useCanalErro(): CanalErro {
  const contexto = useContext(ErroContext);
  if (!contexto) throw new Error('useCanalErro precisa estar dentro de <ErroProvider>');
  return contexto;
}
