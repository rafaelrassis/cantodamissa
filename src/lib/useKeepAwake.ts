import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Mantém a tela acesa via Wake Lock API (suportado em navegadores modernos
 * e via plugin nativo do Capacitor na Fase 2 Android).
 * Falha graciosamente em navegadores sem suporte.
 */
export function useKeepAwake() {
  const [active, setActive] = useState(false);
  const [supported] = useState(() => 'wakeLock' in navigator);
  const lockRef = useRef<WakeLockSentinel | null>(null);

  const enable = useCallback(async () => {
    if (!supported) return;
    try {
      lockRef.current = await navigator.wakeLock.request('screen');
      setActive(true);
      lockRef.current.addEventListener('release', () => setActive(false));
    } catch {
      setActive(false);
    }
  }, [supported]);

  const disable = useCallback(async () => {
    await lockRef.current?.release();
    lockRef.current = null;
    setActive(false);
  }, []);

  const toggle = useCallback(() => {
    if (active) {
      disable();
    } else {
      enable();
    }
  }, [active, enable, disable]);

  // reativa se a aba voltar a ficar visível (o SO libera o lock ao trocar de app)
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && active && !lockRef.current) {
        enable();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [active, enable]);

  return { active, supported, toggle };
}
