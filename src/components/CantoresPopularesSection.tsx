import { PaginatedCarousel } from './PaginatedCarousel';
import type { Cantor } from '../types/cantor';

interface Props {
  cantores: Cantor[];
  onSelectCantor: (slug: string) => void;
}

export function CantoresPopularesSection({ cantores, onSelectCantor }: Props) {
  if (cantores.length === 0) return null;

  return (
    <section className="py-3">
      <div className="mb-2 flex items-center justify-between px-4 md:px-0">
        <h2 className="text-sm font-semibold text-[var(--muted)]">Artistas populares</h2>
      </div>

      <PaginatedCarousel
        items={cantores}
        pageSize={5}
        renderPage={(pageItems) => (
          <div className="flex justify-start gap-4 px-4 md:px-0">
            {pageItems.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectCantor(c.slug)}
                className="flex flex-col items-center gap-1.5"
              >
                {c.fotoUrl ? (
                  <img
                    src={c.fotoUrl}
                    alt={c.nome}
                    className="h-16 w-16 rounded-full border border-[var(--border)] object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--accent-soft)] font-mono text-lg font-bold text-[var(--accent)]">
                    {c.nome.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="max-w-[10rem] text-center text-xs text-[var(--text)]">
                  {c.nome.length > 35 ? `${c.nome.slice(0, 35)}…` : c.nome}
                </span>
              </button>
            ))}
          </div>
        )}
      />
    </section>
  );
}
