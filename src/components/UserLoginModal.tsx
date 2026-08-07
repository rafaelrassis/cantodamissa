import { X } from 'lucide-react';
import { GoogleIcon } from './GoogleIcon';

interface Props {
  onLogin: () => void;
  onClose: () => void;
}

export function UserLoginModal({ onLogin, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 lg:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-[var(--bg)] p-6 lg:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text)]">Entrar</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-[var(--muted)]">
            <X size={20} />
          </button>
        </div>

        <p className="mb-4 text-sm text-[var(--muted)]">
          Entre para salvar músicas offline e participar de repertórios compartilhados.
        </p>

        <button
          onClick={onLogin}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium text-[var(--text)] shadow-[var(--shadow)] transition hover:shadow-md"
        >
          <GoogleIcon />
          Entrar com Google
        </button>

        <p className="mt-4 text-center text-xs text-[var(--muted)]">
          Login simulado — substituir por OAuth Google real na Fase 2 (ver SPEC.md).
        </p>
      </div>
    </div>
  );
}
