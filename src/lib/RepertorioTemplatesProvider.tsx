import type { ReactNode } from 'react';
import { RepertorioTemplatesContext } from './repertorioTemplatesContext';
import { useRepertorioTemplates } from './useRepertorioTemplates';

export function RepertorioTemplatesProvider({
  ministerioId,
  children,
}: {
  ministerioId: string | null;
  children: ReactNode;
}) {
  const valor = useRepertorioTemplates(ministerioId);
  return <RepertorioTemplatesContext.Provider value={valor}>{children}</RepertorioTemplatesContext.Provider>;
}
