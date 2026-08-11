import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ItemRoteiro } from '../../types/ministerio';

interface Props {
  nomeEscala: string;
  onCancelar: () => void;
  onSalvar: (evento: ItemRoteiro) => void;
}

export function EventoRoteiroTela({ nomeEscala, onCancelar, onSalvar }: Props) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [horas, setHoras] = useState('');
  const [minutos, setMinutos] = useState('');
  const [segundos, setSegundos] = useState('');
  const [icone, setIcone] = useState('📣');
  const [editandoIcone, setEditandoIcone] = useState(false);

  function handleSalvar() {
    if (!titulo.trim()) return;
    const duracaoSegundos =
      (Number(horas) || 0) * 3600 + (Number(minutos) || 0) * 60 + (Number(segundos) || 0);
    onSalvar({
      id: `ev-${Date.now()}`,
      tipo: 'evento',
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      duracaoSegundos: duracaoSegundos || undefined,
      icone,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-4">
        <button onClick={onCancelar} aria-label="Voltar">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-extrabold tracking-tight">Evento de roteiro</h1>
          <p className="text-xs text-[var(--muted)]">{nomeEscala}</p>
        </div>
        <button
          onClick={handleSalvar}
          disabled={!titulo.trim()}
          className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-40"
        >
          <Check size={15} /> Salvar
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]"
        />

        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value.slice(0, 200))}
          placeholder="Descrição (Opcional)"
          rows={2}
          className="mt-4 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]"
        />
        <p className="mt-1 text-right text-xs text-[var(--muted)]">{descricao.length}/200</p>

        <h3 className="mt-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Duração</h3>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            placeholder="Horas"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-center text-sm outline-none focus:border-[var(--accent)]"
          />
          <span className="text-[var(--muted)]">:</span>
          <input
            type="number"
            min={0}
            max={59}
            value={minutos}
            onChange={(e) => setMinutos(e.target.value)}
            placeholder="Minutos"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-center text-sm outline-none focus:border-[var(--accent)]"
          />
          <span className="text-[var(--muted)]">:</span>
          <input
            type="number"
            min={0}
            max={59}
            value={segundos}
            onChange={(e) => setSegundos(e.target.value)}
            placeholder="Segundos"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-center text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          {editandoIcone ? (
            <div className="flex items-center gap-2 p-3">
              <input
                autoFocus
                value={icone}
                onChange={(e) => setIcone(e.target.value)}
                maxLength={2}
                className="w-12 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-center text-lg"
              />
              <button
                onClick={() => setEditandoIcone(false)}
                className="ml-auto rounded-md bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--accent-fg)]"
              >
                Ok
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditandoIcone(true)}
              className="flex w-full items-center gap-3 px-3 py-3 text-left"
            >
              <span className="text-lg">{icone}</span>
              <span className="flex-1 text-sm font-medium">Ícone</span>
              <ChevronRight size={16} className="text-[var(--muted)]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
