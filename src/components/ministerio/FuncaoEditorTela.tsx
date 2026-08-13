import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
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
      <header className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-[var(--border)] bg-[var(--bg)] px-[18px] py-3.5 lg:px-10">
        <button onClick={onVoltar} aria-label="Voltar" className="text-[var(--text)]">
          <ChevronLeft size={20} strokeWidth={2.75} />
        </button>
        <h1 className="text-[19px] leading-none">{titulo}</h1>
        <button
          onClick={() => nome.trim() && onSalvar(nome.trim(), icone)}
          disabled={!nome.trim()}
          className="ml-auto flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-[18px] py-2 text-[13.5px] font-bold text-[var(--accent-fg)] disabled:opacity-40"
        >
          <Check size={15} strokeWidth={2.75} /> Salvar
        </button>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-5 lg:px-10">
        <label className="mb-[5px] block text-xs font-bold text-[var(--muted)]">Nome *</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoFocus
          placeholder="Ex: Violão"
          className="input-field w-full text-[var(--text)] placeholder:text-[#99a390] focus:outline-none"
        />

        <button
          onClick={() => setPickerAberto(true)}
          className="mt-[22px] flex w-full items-center gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--bg)] text-xl">
            {icone}
          </span>
          <span className="flex-1 text-sm font-medium text-[var(--text)]">Ícone</span>
          <ChevronRight size={16} strokeWidth={2.75} className="text-[var(--muted)]" />
        </button>
      </div>

      <IconePickerSheet open={pickerAberto} onClose={() => setPickerAberto(false)} onSelecionar={setIcone} />
    </div>
  );
}
