import { useRef, useState, type ReactNode } from 'react';

interface PaginatedCarouselProps<T> {
  items: T[];
  pageSize?: number;
  renderPage: (pageItems: T[], pageIndex: number) => ReactNode;
}

/**
 * Mostra os itens em "páginas" de N (padrão 5). O usuário arrasta
 * horizontalmente pra ver a próxima página, até acabar a lista.
 * Usa scroll-snap nativo (funciona com dedo/touch e mouse-drag).
 */
export function PaginatedCarousel<T>({
  items,
  pageSize = 5,
  renderPage,
}: PaginatedCarouselProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pagina, setPagina] = useState(0);

  const paginas: T[][] = [];
  for (let i = 0; i < items.length; i += pageSize) {
    paginas.push(items.slice(i, i + pageSize));
  }

  function onScroll() {
    const el = containerRef.current;
    if (!el) return;
    const novaPagina = Math.round(el.scrollLeft / el.clientWidth);
    if (novaPagina !== pagina) setPagina(novaPagina);
  }

  if (paginas.length === 0) return null;

  return (
    <div>
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {paginas.map((pageItems, i) => (
          <div key={i} className="w-full shrink-0 snap-start">
            {renderPage(pageItems, i)}
          </div>
        ))}
      </div>

      {paginas.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {paginas.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === pagina ? 'w-[22px] bg-[var(--accent)]' : 'w-1.5 bg-[var(--border)]'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
