import { useState } from 'react';
import { ListPlus } from 'lucide-react';
import type { Repertorio } from '../lib/repertorios';

interface Props {
  repertorios: Repertorio[];
  onAdd: (repertorioId: string) => void;
}

/**
 * Botão "+" que abre a lista de repertórios existentes pra adicionar a
 * música. Criar repertório novo só é feito na página de Repertórios — não
 * tem atalho de criação aqui de propósito (evita duplicar o fluxo em
 * vários lugares do app).
 */
export function AddToRepertorioMenu({ repertorios, onAdd }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative shrink-0"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Adicionar ao repertório"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] hover:bg-[var(--surface2)]"
      >
        <ListPlus size={16} />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-9 z-30 w-56 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-1.5 shadow-[var(--shadow)]"
        >
          {repertorios.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-[var(--muted)]">
              Você ainda não tem repertórios. Crie um na aba Repertórios.
            </p>
          ) : (
            repertorios.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  onAdd(r.id);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--surface)]"
              >
                <span className="truncate">{r.nome}</span>
                <span className="shrink-0 text-xs text-[var(--muted)]">{r.itens.length}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
