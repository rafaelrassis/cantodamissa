import { createContext, useContext } from 'react';
import type { RepertorioTemplatesApi } from './useRepertorioTemplates';

/**
 * Uma instância só dos templates de repertório pro app inteiro (o
 * provider fica em RepertorioTemplatesProvider.tsx, montado dentro de
 * App.tsx — precisa do ministerio ativo, que só existe lá).
 *
 * Mesmo raciocínio de repertoriosContext.ts: o "Salvar" da cifra
 * (RepertorioPickerSheet) é aberto a partir de MusicaCard/CifraOptionsMenu
 * em dezenas de telas — sem um contexto, cada uma teria que receber
 * `templates` por prop até lá embaixo, ou duplicar a busca.
 */
export const RepertorioTemplatesContext = createContext<RepertorioTemplatesApi | null>(null);

export function useRepertorioTemplatesGlobais(): RepertorioTemplatesApi {
  const contexto = useContext(RepertorioTemplatesContext);
  if (!contexto) {
    throw new Error('useRepertorioTemplatesGlobais precisa estar dentro de <RepertorioTemplatesProvider>');
  }
  return contexto;
}
