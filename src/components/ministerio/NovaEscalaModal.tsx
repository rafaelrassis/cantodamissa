import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSalvar: (titulo: string, data: string, hora: string) => void;
}

export function NovaEscalaModal({ onClose, onSalvar }: Props) {
  const [titulo, setTitulo] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('19:00');

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 lg:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-[var(--bg)] p-6 lg:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text)]">Nova escala</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-[var(--muted)]">
            <X size={20} />
          </button>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-semibold text-[var(--muted)]">Título *</span>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Missa Dominical 19h"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          />
        </label>

        <div className="mb-4 flex gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-semibold text-[var(--muted)]">Data</span>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-xs font-semibold text-[var(--muted)]">Hora</span>
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
            />
          </label>
        </div>

        <button
          disabled={!titulo || !data}
          onClick={() => onSalvar(titulo, data, hora)}
          className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-40"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}
