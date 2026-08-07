import { ChevronLeft } from 'lucide-react';

interface Props {
  onLogin: () => void;
  onBack: () => void;
}

export function AdminLogin({ onLogin, onBack }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg)] px-4 font-sans text-[var(--text)]">
      <button
        onClick={onBack}
        className="absolute left-4 top-4 flex items-center gap-1 text-xs text-[var(--muted)]"
      >
        <ChevronLeft size={14} /> Voltar
      </button>

      <h1 className="text-xl font-extrabold tracking-tight">Acesso restrito</h1>
      <p className="text-sm text-[var(--muted)]">Entre para revisar as sugestões da comunidade.</p>

      <button
        onClick={onLogin}
        className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 shadow-[var(--shadow)] transition hover:shadow-md"
      >
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#FFC107"
            d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
          />
          <path
            fill="#FF3D00"
            d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.7 35 27 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.7 39.7 16.3 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.6 5.6C41.5 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"
          />
        </svg>
        Entrar com Google
      </button>

      <p className="max-w-xs text-center text-xs text-[var(--muted)]">
        Login simulado — substituir por OAuth Google real na Fase 2 (ver SPEC.md).
      </p>
    </div>
  );
}
