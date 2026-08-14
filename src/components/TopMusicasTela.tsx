import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { Musica } from '../types/musica';
import { getTop50 } from '../lib/musicasApi';
import { useRepertorios } from '../lib/useRepertorios';
import { MusicaCard } from './MusicaCard';

interface Props {
  onBack: () => void;
  onSelectMusica: (musica: Musica) => void;
}

/** Tela "ver tudo" das músicas em alta — top 50 completo. */
export function TopMusicasTela({ onBack, onSelectMusica }: Props) {
  const [musicas, setMusicas] = useState<Musica[]>([]);
  const [carregando, setCarregando] = useState(true);
  const { repertorios, adicionarMusica } = useRepertorios();

  useEffect(() => {
    getTop50({}, 50).then((lista) => {
      setMusicas(lista);
      setCarregando(false);
    });
  }, []);

  function adicionar(repertorioId: string, musica: Musica, rito: string) {
    adicionarMusica(repertorioId, {
      musicaId: musica.id,
      title: musica.title,
      artist: musica.artist,
      tone: musica.originalTone,
      momento: rito,
    });
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="bg-[var(--accent)] px-4 py-4 text-[var(--accent-fg)] md:px-10">
        <button onClick={onBack} className="mb-2 flex items-center gap-1 text-xs opacity-80">
          <ChevronLeft size={14} /> Voltar
        </button>
        <h1 className="text-xl font-extrabold tracking-tight">Músicas em alta</h1>
        <p className="mt-0.5 text-sm opacity-80">Top 50 mais tocadas</p>
      </header>

      <div className="mx-auto max-w-3xl md:my-6 md:rounded-2xl md:border md:border-[var(--border)]">
        {carregando && (
          <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">carregando…</p>
        )}
        {musicas.map((musica, i) => (
          <MusicaCard
            key={musica.id}
            musica={musica}
            posicao={i + 1}
            onClick={() => onSelectMusica(musica)}
            repertorios={repertorios}
            onAddToRepertorio={(repertorioId, rito) => adicionar(repertorioId, musica, rito)}
          />
        ))}
      </div>
    </div>
  );
}
