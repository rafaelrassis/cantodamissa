import { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import type { MembroMinisterio } from '../../types/ministerio';

interface Props {
  titulo: string;
  nomeInicial: string;
  membroIdsIniciais: string[];
  membros: MembroMinisterio[];
  onVoltar: () => void;
  onSalvar: (nome: string, membroIds: string[]) => void;
}

export function EquipeEditorTela({ titulo, nomeInicial, membroIdsIniciais, membros, onVoltar, onSalvar }: Props) {
  const [nome, setNome] = useState(nomeInicial);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set(membroIdsIniciais));

  function toggle(id: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)] px-4 py-4 md:px-10">
        <button onClick={onVoltar} aria-label="Voltar" className="text-[var(--text)]">
          <ChevronRight size={20} className="rotate-180" />
        </button>
        <h1 className="text-lg font-extrabold tracking-tight">{titulo}</h1>
        <button
          onClick={() => nome.trim() && onSalvar(nome.trim(), Array.from(selecionados))}
          disabled={!nome.trim()}
          className="ml-auto flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-40"
        >
          <Check size={15} /> Salvar
        </button>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 md:px-10">
        <label className="block text-xs font-semibold text-[var(--muted)]">Nome *</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoFocus
          placeholder="Ex: Equipe A"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />

        <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
          Membros ({selecionados.size})
        </p>
        <ul className="flex flex-col gap-1">
          {membros.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${m.avatarCor}`}
              >
                {m.nome[0]}
              </span>
              <span className="flex-1 text-sm font-medium">{m.nome}</span>
              <button
                onClick={() => toggle(m.id)}
                aria-label={selecionados.has(m.id) ? 'Remover' : 'Adicionar'}
                className={`h-6 w-11 shrink-0 rounded-full transition ${
                  selecionados.has(m.id) ? 'bg-[var(--accent)]' : 'border border-[var(--border)] bg-[var(--surface)]'
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white shadow transition ${
                    selecionados.has(m.id) ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
