import { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { IconePickerSheet } from './IconePickerSheet';

interface Props {
  titulo: string;
  nomeInicial: string;
  iconeInicial: string;
  onVoltar: () => void;
  onSalvar: (nome: string, icone: string) => void;
}

export function FuncaoEditorTela({ titulo, nomeInicial, iconeInicial, onVoltar, onSalvar }: Props) {
  const [nome, setNome] = useState(nomeInicial);
  const [icone, setIcone] = useState(iconeInicial);
  const [pickerAberto, setPickerAberto] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)] px-4 py-4 lg:px-10">
        <button onClick={onVoltar} aria-label="Voltar" className="text-[var(--text)]">
          <ChevronRight size={20} className="rotate-180" />
        </button>
        <h1 className="text-lg font-extrabold tracking-tight">{titulo}</h1>
        <button
          onClick={() => nome.trim() && onSalvar(nome.trim(), icone)}
          disabled={!nome.trim()}
          className="ml-auto flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-40"
        >
          <Check size={15} /> Salvar
        </button>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 lg:px-10">
        <label className="block text-xs font-semibold text-[var(--muted)]">Nome *</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoFocus
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />

        <button
          onClick={() => setPickerAberto(true)}
          className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--bg)] text-xl">
            {icone}
          </span>
          <span className="flex-1 text-sm font-medium">Ícone</span>
          <ChevronRight size={16} className="text-[var(--muted)]" />
        </button>
      </div>

      <IconePickerSheet open={pickerAberto} onClose={() => setPickerAberto(false)} onSelecionar={setIcone} />
    </div>
  );
}
