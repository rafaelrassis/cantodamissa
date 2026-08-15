import { createContext, useContext } from 'react';
import type { RepertoriosApi } from './useRepertorios';

/**
 * Uma instância só dos repertórios pro app inteiro (o provider fica em
 * RepertoriosProvider.tsx).
 *
 * Antes oito telas chamavam `useRepertorios()` cada uma por sua conta:
 * oito cópias do mesmo estado, oito buscas iguais no carregamento e,
 * pior, mutação numa cópia não aparecia nas outras — adicionar música ao
 * repertório pelo leitor de cifra não atualizava a lista da Home até a
 * tela ser remontada.
 */
export const RepertoriosContext = createContext<RepertoriosApi | null>(null);

export function useRepertorios(): RepertoriosApi {
  const contexto = useContext(RepertoriosContext);
  if (!contexto) {
    throw new Error('useRepertorios precisa estar dentro de <RepertoriosProvider>');
  }
  return contexto;
}
