import * as Sentry from '@sentry/react';

/**
 * Monitoramento de erro em prod. Sem isso, um bug só é descoberto quando
 * o usuário reclama (e geralmente sem detalhe nenhum de stack/contexto).
 * Opcional de propósito: sem VITE_SENTRY_DSN definido (dev local, PR
 * preview sem a env configurada), o app roda normalmente sem reportar.
 */
const dsn = import.meta.env.VITE_SENTRY_DSN;

export function iniciarSentry(): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
}

export function capturarErro(erro: Error, contexto?: Record<string, unknown>): void {
  if (!dsn) return;
  Sentry.captureException(erro, contexto ? { extra: contexto } : undefined);
}
