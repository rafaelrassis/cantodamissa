import { Star, X } from 'lucide-react';
import type { ProximoRepertorioFavorito } from '../lib/favoritosMinisterio';

interface Props {
  itens: ProximoRepertorioFavorito[];
  isLoggedIn: boolean;
  removendo: string | null;
  onAbrirBuscar?: () => void;
  onAbrirRepertorio: (id: string) => void;
  onRemover: (ministerioId: string) => void;
}

/** "Favoritos" na Início — ministérios que o usuário segue sem ser membro,
 * com o repertório da próxima escala publicada de cada um (se houver).
 * Ver BuscarMinisterioTela / useFavoritosMinisterioHome. */
export function FavoritosMinisterioSection({
  itens,
  isLoggedIn,
  removendo,
  onAbrirBuscar,
  onAbrirRepertorio,
  onRemover,
}: Props) {
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
          {isLoggedIn
            ? 'Favorite um ministério pra ver aqui o repertório da próxima escala.'
            : 'Entre e favorite um ministério pra ver aqui o repertório da próxima escala.'}
        </div>
      )}

      {itens.map((f) => (
        <div
          key={f.ministerioId}
          className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"
        >
          <Star size={16} className="shrink-0 fill-[var(--accent)] text-[var(--accent)]" />
          <button
            onClick={() => f.proximo && onAbrirRepertorio(f.proximo.repertorioId)}
            disabled={!f.proximo}
            className="min-w-0 flex-1 text-left disabled:cursor-default"
          >
            <p className="truncate text-sm font-semibold text-[var(--text)]">{f.ministerioNome}</p>
            {f.proximo ? (
              <p className="truncate text-xs text-[var(--accent)]">
                {f.proximo.nome} ·{' '}
                {new Date(`${f.proximo.data}T00:00:00`).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                })}{' '}
                · {f.proximo.hora}
              </p>
            ) : (
              <p className="truncate text-xs text-[var(--muted)]">Nenhuma escala aberta no momento.</p>
            )}
          </button>
          <button
            onClick={() => onRemover(f.ministerioId)}
            disabled={removendo === f.ministerioId}
            aria-label="Remover dos favoritos"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--bg)] disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
