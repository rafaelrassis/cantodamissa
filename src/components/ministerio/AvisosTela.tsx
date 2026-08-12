import { useState } from 'react';
import { Megaphone, Plus, X } from 'lucide-react';
import type { Aviso } from '../../types/ministerio';

interface Props {
  souAdmin: boolean;
  avisos: Aviso[];
  onCriar: (titulo: string, descricao: string, emDestaque: boolean) => void;
}

export function AvisosTela({ avisos, onCriar, souAdmin }: Props) {
  const [formAberto, setFormAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [emDestaque, setEmDestaque] = useState(false);

  const ativos = avisos.filter((a) => !a.arquivado);

  function salvar() {
    if (!titulo || !descricao) return;
    onCriar(titulo, descricao, emDestaque);
    setTitulo('');
    setDescricao('');
    setEmDestaque(false);
    setFormAberto(false);
  }

  return (
    <div className="px-4 pb-24 pt-4">
      {ativos.length === 0 ? (
        <p className="mt-8 text-center text-sm text-[var(--muted)]">Lista vazia.</p>
      ) : (
        <ul className="space-y-2">
          {ativos.map((a) => (
            <li key={a.id} className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                <Megaphone size={16} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--text)]">
                  {a.titulo} {a.emDestaque && <span className="text-[10px] text-[var(--accent)]">· destaque</span>}
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">{a.descricao}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {souAdmin && (
        <button
          onClick={() => setFormAberto(true)}
          aria-label="Novo aviso"
          className="fixed bottom-24 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] shadow-[var(--shadow)]"
        >
          <Plus size={22} />
        </button>
      )}

      {souAdmin && formAberto && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 lg:items-center">
          <div className="w-full max-w-sm rounded-t-2xl bg-[var(--bg)] p-6 lg:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text)]">Novo aviso</h2>
              <button onClick={() => setFormAberto(false)} aria-label="Fechar" className="text-[var(--muted)]">
                <X size={20} />
              </button>
            </div>

            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-semibold text-[var(--muted)]">Título *</span>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={40}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
              />
            </label>

            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-semibold text-[var(--muted)]">Descrição *</span>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                maxLength={2000}
                rows={4}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
              />
            </label>

            <label className="mb-4 flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
              <span className="text-sm text-[var(--text)]">Em destaque (aparece na Início)</span>
              <input
                type="checkbox"
                checked={emDestaque}
                onChange={(e) => setEmDestaque(e.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
            </label>

            <button
              onClick={salvar}
              disabled={!titulo || !descricao}
              className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-40"
            >
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
