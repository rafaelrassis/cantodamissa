import { useState } from 'react';
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
  // Ministério cuja lista de próximas missas está aberta pra escolha —
  // só entra em jogo quando há mais de uma escala na mesma data (ver
  // migration 0027).
  const [escolhendoDe, setEscolhendoDe] = useState<ProximoRepertorioFavorito | null>(null);

  function abrir(f: ProximoRepertorioFavorito) {
    if (f.proximos.length === 1) {
      onAbrirRepertorio(f.proximos[0].repertorioId);
    } else if (f.proximos.length > 1) {
      setEscolhendoDe(f);
    }
  }

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

      {itens.map((f) => {
        const [primeiro] = f.proximos;
        return (
          <div
            key={f.ministerioId}
            className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"
          >
            <Star size={16} className="shrink-0 fill-[var(--accent)] text-[var(--accent)]" />
            <button
              onClick={() => abrir(f)}
              disabled={f.proximos.length === 0}
              className="min-w-0 flex-1 text-left disabled:cursor-default"
            >
              <p className="truncate text-sm font-semibold text-[var(--text)]">{f.ministerioNome}</p>
              {primeiro ? (
                <p className="truncate text-xs text-[var(--accent)]">
                  {f.proximos.length > 1
                    ? `${f.proximos.length} missas`
                    : primeiro.nome}{' '}
                  ·{' '}
                  {new Date(`${primeiro.data}T00:00:00`).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                  })}
                  {f.proximos.length === 1 && ` · ${primeiro.hora}`}
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
        );
      })}

      {escolhendoDe && (
        <div
          onClick={() => setEscolhendoDe(null)}
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 font-sans md:items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-2xl bg-[var(--bg)] p-5 text-[var(--text)] md:rounded-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">{escolhendoDe.ministerioNome}</h2>
              <button onClick={() => setEscolhendoDe(null)} aria-label="Fechar" className="text-[var(--muted)]">
                <X size={18} />
              </button>
            </div>
            <p className="mb-3 text-xs text-[var(--muted)]">Mais de uma missa nessa data — escolha qual repertório abrir.</p>
            <div className="flex flex-col gap-1">
              {escolhendoDe.proximos.map((p) => (
                <button
                  key={p.repertorioId}
                  onClick={() => {
                    onAbrirRepertorio(p.repertorioId);
                    setEscolhendoDe(null);
                  }}
                  className="flex flex-col rounded-xl border border-[var(--border)] px-3 py-2.5 text-left hover:bg-[var(--accent-soft)]"
                >
                  <span className="text-sm font-semibold">{p.nome}</span>
                  <span className="text-xs text-[var(--muted)]">{p.hora}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
