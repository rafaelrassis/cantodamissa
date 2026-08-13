import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ListPlus, MoreVertical, Share2 } from 'lucide-react';
import type { Repertorio } from '../lib/repertorios';
import type { Musica } from '../types/musica';
import { RepertorioPickerSheet } from './RepertorioPickerSheet';

interface Props {
  musica: Musica;
  repertorios: Repertorio[];
  onAdicionarAoRepertorio: (repertorioId: string, rito: string) => void;
  onCompartilhar: () => void;
  buttonClassName?: string;
}

const LARGURA_MENU = 240; // w-60

/**
 * Menu "..." da cifra: compartilhar ou colocar num repertório (abre o
 * mesmo sheet "Salvar" do botão "+" — ver RepertorioPickerSheet).
 *
 * O dropdown é renderizado via portal em document.body com
 * position: fixed calculado a partir do botão, em vez de position:
 * absolute relativo ao próprio wrapper. Isso evita que ele fique cortado
 * quando o card está dentro de um container com overflow (ex: o
 * carrossel paginado "Músicas em alta" em Home.tsx — overflow-x-auto
 * corta o eixo Y junto, cortando/deslocando o dropdown absoluto).
 */
export function CifraOptionsMenu({
  musica,
  repertorios,
  onAdicionarAoRepertorio,
  onCompartilhar,
  buttonClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pickerAberto, setPickerAberto] = useState(false);
  const [posicao, setPosicao] = useState<{ top: number; left: number } | null>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open || !botaoRef.current) return;
    const r = botaoRef.current.getBoundingClientRect();
    const left = Math.min(r.right - LARGURA_MENU, window.innerWidth - LARGURA_MENU - 8);
    setPosicao({ top: r.bottom + 4, left: Math.max(8, left) });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    function fechar() {
      setOpen(false);
    }
    // Fecha se rolar (a posição fixa ficaria desalinhada do botão) ou redimensionar.
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);
    return () => {
      window.removeEventListener('scroll', fechar, true);
      window.removeEventListener('resize', fechar);
    };
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        ref={botaoRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Mais opções"
        className={
          buttonClassName ??
          'flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface2)]'
        }
      >
        <MoreVertical size={16} strokeWidth={2.75} />
      </button>

      {open &&
        posicao &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ top: posicao.top, left: posicao.left, width: LARGURA_MENU }}
              className="fixed z-50 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-1.5 shadow-[0_12px_30px_rgba(30,42,20,.18)]"
            >
              <button
                onClick={() => {
                  onCompartilhar();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-[14px] px-2.5 py-2.5 text-left text-sm text-[var(--text)] hover:bg-[var(--surface)]"
              >
                <Share2 size={15} strokeWidth={2.75} /> Compartilhar
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setPickerAberto(true);
                }}
                className="flex w-full items-center gap-2 rounded-[14px] px-2.5 py-2.5 text-left text-sm text-[var(--text)] hover:bg-[var(--surface)]"
              >
                <ListPlus size={15} strokeWidth={2.75} /> Colocar no repertório
              </button>
            </div>
          </>,
          document.body
        )}

      {pickerAberto && (
        <RepertorioPickerSheet
          musica={musica}
          repertorios={repertorios}
          onAdicionar={onAdicionarAoRepertorio}
          onFechar={() => setPickerAberto(false)}
        />
      )}
    </div>
  );
}
