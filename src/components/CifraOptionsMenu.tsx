import { useState } from 'react';
import { ChevronLeft, ListPlus, MoreVertical, Share2 } from 'lucide-react';
import type { Repertorio } from '../lib/repertorios';

interface Props {
  repertorios: Repertorio[];
  onAdicionarAoRepertorio: (repertorioId: string) => void;
  onCompartilhar: () => void;
}

/**
 * Menu "..." da cifra: compartilhar ou colocar num repertório existente.
 * Criar repertório novo não é uma opção aqui de propósito — só na página
 * de Repertórios (evita duplicar esse fluxo em vários lugares do app).
 */
export function CifraOptionsMenu({ repertorios, onAdicionarAoRepertorio, onCompartilhar }: Props) {
  const [open, setOpen] = useState(false);
  const [tela, setTela] = useState<'menu' | 'repertorios'>('menu');

  function fechar() {
    setOpen(false);
    setTela('menu');
  }

  return (
    <div
      className="relative shrink-0"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) fechar();
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Mais opções"
        className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] hover:bg-[var(--surface2)]"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-9 z-30 w-60 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-1.5 shadow-[var(--shadow)]"
        >
          {tela === 'menu' ? (
            <>
              <button
                onClick={() => {
                  onCompartilhar();
                  fechar();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--surface)]"
              >
                <Share2 size={15} /> Compartilhar
              </button>
              <button
                onClick={() => setTela('repertorios')}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--surface)]"
              >
                <ListPlus size={15} /> Colocar no repertório
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setTela('menu')}
                className="mb-1 flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--muted)]"
              >
                <ChevronLeft size={13} /> voltar
              </button>
              {repertorios.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-[var(--muted)]">
                  Você ainda não tem repertórios. Crie um na aba Repertórios.
                </p>
              ) : (
                repertorios.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      onAdicionarAoRepertorio(r.id);
                      fechar();
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--surface)]"
                  >
                    <span className="truncate">{r.nome}</span>
                    <span className="shrink-0 text-xs text-[var(--muted)]">{r.itens.length}</span>
                  </button>
                ))
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
