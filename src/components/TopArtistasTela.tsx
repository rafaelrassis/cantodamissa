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
      <header className="bg-[var(--accent)] px-4 py-5 text-[var(--accent-fg)] lg:px-10 lg:pb-6">
        <button onClick={onBack} className="mb-2 flex items-center gap-1 text-xs opacity-80">
          <ChevronLeft size={14} strokeWidth={2.75} /> Voltar
        </button>
        <h1 className="text-[30px]">Artistas mais ouvidos</h1>
        <p className="mt-1 text-[14.5px] opacity-85">Top 20</p>
      </header>

      <div className="mx-auto max-w-3xl lg:my-[26px] lg:rounded-[24px] lg:border lg:border-[var(--border)]">
        {carregando && (
          <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">carregando…</p>
        )}
        {artistas.map((a, i) => (
          <button
            key={a.artist}
            onClick={() => onSelectArtista(a.artist)}
            className="flex w-full items-center gap-3.5 border-b border-[var(--border)] px-5 py-3.5 text-left transition-colors last:border-b-0 hover:bg-[var(--surface)]"
          >
            <span className="w-6 shrink-0 text-right font-mono text-sm text-[var(--muted)]">
              {i + 1}
            </span>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] font-mono text-[15px] font-bold text-[var(--accent)]">
              {a.artist.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-[var(--text)]">{a.artist}</p>
              <p className="truncate text-[12.5px] text-[var(--muted)]">
                {a.songCount} música{a.songCount === 1 ? '' : 's'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
