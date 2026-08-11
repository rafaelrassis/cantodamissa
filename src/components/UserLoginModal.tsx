import { useState } from 'react';
import { Cake, X } from 'lucide-react';
import { GoogleIcon } from './GoogleIcon';

interface Props {
  precisaDataNascimento: boolean;
  onLogin: (dataNascimento?: string) => void;
  onClose: () => void;
  onAdminLogin: () => void;
}

export function UserLoginModal({ precisaDataNascimento, onLogin, onClose, onAdminLogin }: Props) {
  const [etapa, setEtapa] = useState<'inicial' | 'nascimento'>('inicial');
  const [dataNascimento, setDataNascimento] = useState('');

  function handleEntrarComGoogle() {
    if (precisaDataNascimento) {
      setEtapa('nascimento');
    } else {
      onLogin();
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 lg:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-[var(--bg)] p-6 lg:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text)]">
            {etapa === 'inicial' ? 'Entrar' : 'Finalizar cadastro'}
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="text-[var(--muted)]">
            <X size={20} />
          </button>
        </div>

        {etapa === 'inicial' ? (
          <>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Entre para salvar músicas offline e participar de repertórios compartilhados.
            </p>

            <button
              onClick={handleEntrarComGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium text-[var(--text)] shadow-[var(--shadow)] transition hover:shadow-md"
            >
              <GoogleIcon />
              Entrar com Google
            </button>

            <p className="mt-4 text-center text-xs text-[var(--muted)]">
              Login simulado — substituir por OAuth Google real na Fase 2 (ver SPEC.md).
            </p>

            <button
              onClick={onAdminLogin}
              className="mt-3 block w-full text-center text-xs text-[var(--muted)] underline-offset-2 hover:underline"
            >
              Entrar como administrador
            </button>
          </>
        ) : (
          <>
            <p className="mb-4 flex items-start gap-2 text-sm text-[var(--muted)]">
              <Cake size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
              Sua data de nascimento é usada pra mostrar seu aniversário para o seu ministério, se você
              participar de um.
            </p>

            <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Data de nascimento</label>
            <input
              type="date"
              autoFocus
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />

            <button
              onClick={() => onLogin(dataNascimento)}
              disabled={!dataNascimento}
              className="mt-4 w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-40"
            >
              Concluir cadastro
            </button>
          </>
        )}
      </div>
    </div>
  );
}
