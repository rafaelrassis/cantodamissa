import { ChevronLeft } from 'lucide-react';
import { GoogleIcon } from './GoogleIcon';

interface Props {
  onLogin: () => void;
  onBack: () => void;
}

export function AdminLogin({ onLogin, onBack }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-[10px] bg-[var(--bg)] px-4 font-sans text-[var(--text)]">
      <button
        onClick={onBack}
        className="absolute left-4 top-4 flex items-center gap-1 text-xs text-[var(--muted)]"
      >
        <ChevronLeft size={14} strokeWidth={2.75} /> Voltar
      </button>

      <h1 className="text-2xl">Acesso restrito</h1>
      <p className="text-sm text-[var(--muted)]">Entre para revisar as sugestões da comunidade.</p>

      <button
        onClick={onLogin}
        className="mt-2 flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold transition hover:bg-[var(--surface2)] hover:shadow-[0_4px_14px_rgba(30,42,20,.08)]"
      >
        <GoogleIcon />
        Entrar com Google
      </button>

      <p className="max-w-xs text-center text-xs text-[var(--muted)]">
        Login simulado — substituir por OAuth Google real na Fase 2 (ver SPEC.md).
      </p>
    </div>
  );
}
