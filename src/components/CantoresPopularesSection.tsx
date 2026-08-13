import { PaginatedCarousel } from './PaginatedCarousel';
import type { Cantor } from '../types/cantor';

interface Props {
  cantores: Cantor[];
  onSelectCantor: (slug: string) => void;
}

export function CantoresPopularesSection({ cantores, onSelectCantor }: Props) {
  if (cantores.length === 0) return null;

  return (
    <section className="mx-4 my-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-[22px] py-[22px] lg:mx-0 lg:px-[26px]">
      <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--muted)]">
        Cantores populares
      </p>

      <PaginatedCarousel
        items={cantores}
        pageSize={5}
        renderPage={(pageItems) => (
          <div className="flex justify-between gap-3">
            {pageItems.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectCantor(c.slug)}
                className="flex w-[88px] flex-col items-center gap-2.5"
              >
                {c.fotoUrl ? (
                  <img
                    src={c.fotoUrl}
                    alt={c.nome}
                    className="h-[88px] w-[88px] rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[var(--accent-soft)] font-display text-[30px] text-[var(--accent)]">
                    {c.nome.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="max-w-full truncate text-center text-[13px] font-semibold text-[var(--text)]">
                  {c.nome}
                </span>
              </button>
            ))}
          </div>
        )}
      />
    </section>
  );
}
