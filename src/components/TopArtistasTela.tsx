import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { getArtistasEmAlta, type ArtistaEmAlta } from '../lib/musicasApi';

interface Props {
  onBack: () => void;
  onSelectArtista: (artista: string) => void;
}

/** Tela "ver tudo" dos artistas mais ouvidos — top 20 completo. */
export function TopArtistasTela({ onBack, onSelectArtista }: Props) {
  const [artistas, setArtistas] = useState<ArtistaEmAlta[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    getArtistasEmAlta(20).then((lista) => {
      setArtistas(lista);
      setCarregando(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="bg-[var(--accent)] px-4 py-4 text-[var(--accent-fg)] lg:px-10">
        <button onClick={onBack} className="mb-2 flex items-center gap-1 text-xs opacity-80">
          <ChevronLeft size={14} /> Voltar
        </button>
        <h1 className="text-xl font-extrabold tracking-tight">Artistas mais ouvidos</h1>
        <p className="mt-0.5 text-sm opacity-80">Top 20</p>
      </header>

      <div className="mx-auto max-w-3xl lg:rounded-2xl lg:border lg:border-[var(--border)] lg:my-6">
        {carregando && (
          <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">carregando…</p>
        )}
        {artistas.map((a, i) => (
          <button
            key={a.artist}
            onClick={() => onSelectArtista(a.artist)}
            className="flex w-full items-center gap-3 border-b border-[var(--border)] px-4 py-3 text-left hover:bg-[var(--surface)]"
          >
            <span className="w-6 shrink-0 text-right font-mono text-sm text-[var(--muted)]">
              {i + 1}
            </span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] font-mono text-sm font-bold text-[var(--accent)]">
              {a.artist.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text)]">{a.artist}</p>
              <p className="truncate text-xs text-[var(--muted)]">
                {a.songCount} música{a.songCount === 1 ? '' : 's'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
