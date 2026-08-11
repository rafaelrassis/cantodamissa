import { useState } from 'react';
import { ListPlus } from 'lucide-react';
import type { Repertorio } from '../lib/repertorios';
import type { Musica } from '../types/musica';
import { RepertorioPickerSheet } from './RepertorioPickerSheet';

interface Props {
  musica: Musica;
  repertorios: Repertorio[];
  onCriar: (nome: string) => Promise<Repertorio>;
  onAdd: (repertorioId: string, rito: string) => void;
}

/** Botão "+" que abre o sheet de "Salvar" no repertório (ver RepertorioPickerSheet). */
export function AddToRepertorioMenu({ musica, repertorios, onCriar, onAdd }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="Adicionar ao repertório"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] hover:bg-[var(--surface2)]"
      >
        <ListPlus size={16} />
      </button>

      {open && (
        <RepertorioPickerSheet
          musica={musica}
          repertorios={repertorios}
          onCriar={onCriar}
          onAdicionar={onAdd}
          onFechar={() => setOpen(false)}
        />
      )}
    </>
  );
}
