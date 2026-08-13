import { useState } from 'react';
import { Church, Drama, Images, Music, Smile, Wrench } from 'lucide-react';
import { CATEGORIAS_ICONE } from '../../lib/iconePickerEmojis';

const ICONE_CATEGORIA: Record<string, typeof Music> = {
  musica: Music,
  objetos: Images,
  papeis: Drama,
  pessoas: Smile,
  ferramentas: Wrench,
  igreja: Church,
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSelecionar: (emoji: string) => void;
}

export function IconePickerSheet({ open, onClose, onSelecionar }: Props) {
  const [categoriaAtiva, setCategoriaAtiva] = useState(CATEGORIAS_ICONE[0].id);
  const categoria = CATEGORIAS_ICONE.find((c) => c.id === categoriaAtiva) ?? CATEGORIAS_ICONE[0];

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-40 max-h-[75vh] rounded-t-[28px] rounded-b-[36px] border-t border-[var(--border)] bg-[var(--surface)] pb-6 pt-3.5 shadow-[0_-18px_40px_rgba(30,42,20,.14)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-[var(--border)]" />

        <div className="mx-[18px] flex gap-1 overflow-x-auto rounded-full bg-[var(--bg)] p-1">
          {CATEGORIAS_ICONE.map((c) => {
            const Icone = ICONE_CATEGORIA[c.id];
            return (
              <button
                key={c.id}
                onClick={() => setCategoriaAtiva(c.id)}
                aria-label={c.label}
                title={c.label}
                className={`flex h-9 flex-1 shrink-0 items-center justify-center rounded-full px-4 text-xs font-semibold transition ${
                  categoriaAtiva === c.id
                    ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                    : 'text-[var(--muted)]'
                }`}
              >
                <Icone size={15} strokeWidth={2.75} />
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid max-h-[45vh] grid-cols-6 gap-1 overflow-y-auto px-[18px]">
          {categoria.emojis.map((emoji, i) => (
            <button
              key={`${categoria.id}-${i}`}
              onClick={() => {
                onSelecionar(emoji);
                onClose();
              }}
              className="flex aspect-square items-center justify-center rounded-2xl text-2xl hover:bg-[var(--bg)]"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
