import { useState } from 'react';
import { Cake } from 'lucide-react';

interface Props {
  onSalvar: (dataNascimento: string) => void;
  onPular: () => void;
}

/**
 * Login com Google é redirect (não popup) — a volta pro app já chega com
 * sessão ativa, sem chance de encadear um passo síncrono antes disso.
 * Por isso a data de nascimento (usada só pro aniversário no Ministério)
 * é pedida depois, num modal separado, na primeira vez que a conta loga
 * sem ter esse dado ainda.
 */
export function CompletarPerfilModal({ onSalvar, onPular }: Props) {
  const [dataNascimento, setDataNascimento] = useState('');

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-[var(--bg)] p-6 md:rounded-2xl">
        <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Finalizar cadastro</h2>

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
          onClick={() => onSalvar(dataNascimento)}
          disabled={!dataNascimento}
          className="mt-4 w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-40"
        >
          Concluir cadastro
        </button>

        <button onClick={onPular} className="mt-3 block w-full text-center text-xs text-[var(--muted)] underline-offset-2 hover:underline">
          Pular por agora
        </button>
      </div>
    </div>
  );
}
