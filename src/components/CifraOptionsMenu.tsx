import { useState } from 'react';
import { ListPlus, MoreVertical, Share2 } from 'lucide-react';
import type { Repertorio } from '../lib/repertorios';
import type { Musica } from '../types/musica';
import { RepertorioPickerSheet } from './RepertorioPickerSheet';

interface Props {
  musica: Musica;
  repertorios: Repertorio[];
  onCriarRepertorio: (nome: string) => Promise<Repertorio>;
  onAdicionarAoRepertorio: (repertorioId: string, rito: string) => void;
  onCompartilhar: () => void;
  buttonClassName?: string;
}

/**
 * Menu "..." da cifra: compartilhar ou colocar num repertório (abre o
 * mesmo sheet "Salvar" do botão "+" — ver RepertorioPickerSheet).
 */
export function CifraOptionsMenu({
  musica,
  repertorios,
  onCriarRepertorio,
  onAdicionarAoRepertorio,
  onCompartilhar,
  buttonClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pickerAberto, setPickerAberto] = useState(false);

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
        aria-label="Mais opções"
        className={
          buttonClassName ??
          'flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] hover:bg-[var(--surface2)]'
        }
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-9 z-30 w-60 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-1.5 shadow-[var(--shadow)]"
        >
          <button
            onClick={() => {
              onCompartilhar();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--surface)]"
          >
            <Share2 size={15} /> Compartilhar
          </button>
          <button
            onClick={() => {
              setOpen(false);
              setPickerAberto(true);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--surface)]"
          >
            <ListPlus size={15} /> Colocar no repertório
          </button>
        </div>
      )}

      {pickerAberto && (
        <RepertorioPickerSheet
          musica={musica}
          repertorios={repertorios}
          onCriar={onCriarRepertorio}
          onAdicionar={onAdicionarAoRepertorio}
          onFechar={() => setPickerAberto(false)}
        />
      )}
    </div>
  );
}
