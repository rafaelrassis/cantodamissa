import { ChevronLeft } from 'lucide-react';
import { GoogleIcon } from './GoogleIcon';

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
        <GoogleIcon />
        Entrar com Google
      </button>

      <p className="max-w-xs text-center text-xs text-[var(--muted)]">
        Login simulado — substituir por OAuth Google real na Fase 2 (ver SPEC.md).
      </p>
    </div>
  );
}
