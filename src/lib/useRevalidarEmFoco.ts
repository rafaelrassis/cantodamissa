import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

/** Intervalo entre revalidações enquanto o app está em primeiro plano. */
const INTERVALO_PADRAO_MS = 30_000;

/**
 * Revalida dados do servidor sem o usuário precisar fechar e abrir o app.
 *
 * No Android (Capacitor) o app quase nunca é realmente encerrado: a
 * pessoa sai pra outra tarefa e volta com o WebView exatamente como
 * estava — nenhum hook remonta, então nada era buscado de novo e a tela
 * ficava mostrando o estado do momento em que foi aberta (ex.: admin não
 * via a solicitação de ingresso recém-enviada; quem pediu pra entrar não
 * via que já tinha sido aprovado).
 *
 * Três gatilhos, porque nenhum cobre todos os casos sozinho:
 * - `appStateChange` do Capacitor: voltar do multitarefa no Android;
 * - `visibilitychange`/`focus`: o mesmo na web/PWA e ao trocar de aba;
 * - intervalo: o app ficou aberto na mesma tela enquanto o dado mudou.
 *
 * A revalidação é silenciosa: falha de rede aqui não vira alerta na tela
 * (o usuário não pediu nada), só mantém o dado anterior.
 */
export function useRevalidarEmFoco(
  revalidar: () => void | Promise<unknown>,
  intervaloMs: number = INTERVALO_PADRAO_MS
) {
  const revalidarRef = useRef(revalidar);
  useEffect(() => {
    revalidarRef.current = revalidar;
  }, [revalidar]);

  useEffect(() => {
    let vivo = true;
    let emAndamento = false;

    const disparar = () => {
      if (!vivo || emAndamento) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      emAndamento = true;
      Promise.resolve(revalidarRef.current())
        .catch(() => {})
        .finally(() => {
          emAndamento = false;
        });
    };

    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') disparar();
    };

    const timer = window.setInterval(disparar, intervaloMs);
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    window.addEventListener('focus', disparar);

    let removerNativo: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) disparar();
      }).then((handle) => {
        if (vivo) removerNativo = () => handle.remove();
        else handle.remove();
      });
    }

    return () => {
      vivo = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      window.removeEventListener('focus', disparar);
      removerNativo?.();
    };
  }, [intervaloMs]);
}

/**
 * Mantém a referência anterior quando o dado revalidado é igual ao que já
 * estava em memória. Sem isso cada revalidação trocaria arrays/objetos por
 * cópias idênticas e faria a árvore inteira re-renderizar (e efeitos que
 * dependem deles rodarem de novo) a cada 30s.
 */
export function preservarSeIgual<T>(anterior: T, novo: T): T {
  return JSON.stringify(anterior) === JSON.stringify(novo) ? anterior : novo;
}
