import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Mantém a tela acesa via Wake Lock API (suportado em navegadores modernos
 * e no WebView do Capacitor). Falha graciosamente onde não há suporte.
 *
 * O ponto sutil: o sistema operacional libera o lock sozinho sempre que a
 * aba perde visibilidade (trocar de app, apagar a tela). Por isso existem
 * dois estados separados — `desejado`, que é a escolha do usuário e só
 * muda quando ele toca no botão, e `lockRef`, que é o lock de fato. A
 * versão anterior guardava só um, e o handler de `release` zerava o
 * "ligado" sem limpar a referência: o efeito de visibilidade nunca
 * reativava, então a tela apagava no meio da missa depois da primeira
 * troca de app e o botão continuava parecendo desligado.
 */
export function useKeepAwake() {
  const [supported] = useState(() => typeof navigator !== 'undefined' && 'wakeLock' in navigator);
  const [desejado, setDesejado] = useState(false);
  const [ativo, setAtivo] = useState(false);
  const lockRef = useRef<WakeLockSentinel | null>(null);

  const adquirir = useCallback(async () => {
    if (!supported || lockRef.current) return;
    try {
      const lock = await navigator.wakeLock.request('screen');
      lockRef.current = lock;
      setAtivo(true);
      lock.addEventListener('release', () => {
        // Liberado pelo sistema (ou por nós): esquece o sentinela, senão a
        // reaquisição abaixo enxerga um lock que já não vale nada.
        lockRef.current = null;
        setAtivo(false);
      });
    } catch {
      setAtivo(false);
    }
  }, [supported]);

  const liberar = useCallback(async () => {
    const lock = lockRef.current;
    lockRef.current = null;
    setAtivo(false);
    await lock?.release().catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setDesejado((anterior) => !anterior);
  }, []);

  useEffect(() => {
    if (desejado) void adquirir();
    else void liberar();
  }, [desejado, adquirir, liberar]);

  // Reativa quando a aba volta a ficar visível — enquanto o usuário não
  // tiver desligado o botão.
  useEffect(() => {
    function aoMudarVisibilidade() {
      if (document.visibilityState === 'visible' && desejado && !lockRef.current) {
        void adquirir();
      }
    }
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    return () => document.removeEventListener('visibilitychange', aoMudarVisibilidade);
  }, [desejado, adquirir]);

  // Solta o lock ao desmontar (sair do leitor de cifra).
  useEffect(() => {
    return () => {
      void lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, []);

  // `active` reflete a intenção do usuário (o botão continua aceso mesmo
  // durante os instantes em que o sistema tirou o lock e ainda não
  // recuperamos); `ativoDeFato` existe pra quem precisar do estado real.
  return { active: desejado, ativoDeFato: ativo, supported, toggle };
}
