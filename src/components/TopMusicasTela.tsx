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
      <header className="bg-[var(--accent)] px-4 py-5 text-[var(--accent-fg)] lg:px-10 lg:pb-6">
        <button onClick={onBack} className="mb-2 flex items-center gap-1 text-xs opacity-80">
          <ChevronLeft size={14} strokeWidth={2.75} /> Voltar
        </button>
        <h1 className="text-[30px]">Músicas em alta</h1>
        <p className="mt-1 text-[14.5px] opacity-85">Top 50 mais tocadas</p>
      </header>

      <div className="mx-auto max-w-3xl lg:my-[26px] lg:rounded-[24px] lg:border lg:border-[var(--border)]">
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
