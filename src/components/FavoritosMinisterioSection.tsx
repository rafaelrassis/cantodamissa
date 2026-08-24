import { Star } from 'lucide-react';
import type { ProximoRepertorioFavorito } from '../lib/favoritosMinisterio';

interface Props {
  itens: ProximoRepertorioFavorito[];
  onAbrirBuscar?: () => void;
  onAbrirRepertorio: (id: string) => void;
}

/** "Favoritos" na Início — ministérios que o usuário segue sem ser membro,
 * com o repertório da próxima escala publicada de cada um (se houver).
 * Ver BuscarMinisterioTela / useFavoritosMinisterioHome. */
export function FavoritosMinisterioSection({ itens, onAbrirBuscar, onAbrirRepertorio }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--muted)]">Favoritos</h2>
        {onAbrirBuscar && (
          <button onClick={onAbrirBuscar} className="text-xs font-semibold text-[var(--accent)]">
            Buscar ministério
          </button>
        )}
      </div>

      {itens.length === 0 && (
        <div className="rounded-xl bg-[var(--accent-soft)] p-3 text-xs text-[var(--muted)]">
          Favorite um ministério pra ver aqui o repertório da próxima escala.
        </div>
      )}

      {itens.map((f) => (
        <div
          key={f.ministerioId}
          className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"
        >
          <Star size={16} className="shrink-0 fill-[var(--accent)] text-[var(--accent)]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--text)]">{f.ministerioNome}</p>
            {f.proximo ? (
              <button
                onClick={() => onAbrirRepertorio(f.proximo!.repertorioId)}
                className="truncate text-left text-xs text-[var(--accent)]"
              >
                {f.proximo.nome} ·{' '}
                {new Date(`${f.proximo.data}T00:00:00`).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                })}{' '}
                · {f.proximo.hora}
              </button>
            ) : (
              <p className="truncate text-xs text-[var(--muted)]">Nenhuma escala aberta no momento.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
