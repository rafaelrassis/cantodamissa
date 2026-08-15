import type { ReactNode } from 'react';
import { RepertoriosContext } from './repertoriosContext';
import { useRepertoriosEstado } from './useRepertorios';

export function RepertoriosProvider({ children }: { children: ReactNode }) {
  const valor = useRepertoriosEstado();
  return <RepertoriosContext.Provider value={valor}>{children}</RepertoriosContext.Provider>;
}
