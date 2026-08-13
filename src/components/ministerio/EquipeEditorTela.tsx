import { useState } from 'react';
import { Check, ChevronLeft } from 'lucide-react';
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
      <header className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-[var(--border)] bg-[var(--bg)] px-[18px] py-3.5 lg:px-10">
        <button onClick={onVoltar} aria-label="Voltar" className="text-[var(--text)]">
          <ChevronLeft size={20} strokeWidth={2.75} />
        </button>
        <h1 className="text-[19px] leading-none">{titulo}</h1>
        <button
          onClick={() => nome.trim() && onSalvar(nome.trim(), Array.from(selecionados))}
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
          placeholder="Ex: Equipe A"
          className="input-field w-full text-[var(--text)] placeholder:text-[#99a390] focus:outline-none"
        />

        <p className="mb-2 mt-[22px] text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
          Membros ({selecionados.size})
        </p>
        <ul className="flex flex-col gap-0.5">
          {membros.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-[16px] px-1 py-2">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${m.avatarCor}`}
              >
                {m.nome[0]}
              </span>
              <span className="flex-1 text-sm font-medium text-[var(--text)]">{m.nome}</span>
              <button
                onClick={() => toggle(m.id)}
                aria-label={selecionados.has(m.id) ? 'Remover' : 'Adicionar'}
                className={`h-[26px] w-11 shrink-0 rounded-full transition ${
                  selecionados.has(m.id) ? 'bg-[var(--accent)]' : 'border border-[var(--border)] bg-[var(--surface)]'
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(30,42,20,.3)] transition ${
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
