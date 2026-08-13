import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * Registra o service worker (só existe no build de produção — em dev
 * devOptions.enabled=false no vite.config.ts, então isso vira no-op).
 * `registerType: 'autoUpdate'` já troca a versão sozinho em segundo
 * plano; a única decisão do usuário é *quando* recarregar pra ativar,
 * porque trocar o JS debaixo dos pés no meio de uma leitura de cifra ao
 * vivo seria pior que esperar. Por isso `precisaAtualizar` fica exposto
 * pra UI mostrar um aviso discreto em vez de recarregar sozinho.
 */
export function useServiceWorkerAtualizacao() {
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false);
  const [pronto, setPronto] = useState<(() => void) | null>(null);

  useEffect(() => {
    const atualizarSW = registerSW({
      onNeedRefresh() {
        setPrecisaAtualizar(true);
        setPronto(() => () => atualizarSW(true));
      },
      onOfflineReady() {
        // eslint-disable-next-line no-console
        console.info('App pronto pra uso offline.');
      },
    });
  }, []);

  return {
    precisaAtualizar,
    atualizarAgora: () => pronto?.(),
  };
}
