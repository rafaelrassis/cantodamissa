import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { Musica } from '../types/musica';
import { getMusicasPorArtista } from '../lib/musicasApi';
import { useRepertorios } from '../lib/useRepertorios';
import { MusicaCard } from './MusicaCard';

type Aba = 'top' | 'todas';

interface Props {
  artista: string;
  onBack: () => void;
  onSelectMusica: (musica: Musica) => void;
}

/**
 * Página de artista derivada do campo texto `artist` (não do cadastro de
 * `cantores`) — é a que abre a partir da lista "Artistas mais ouvidos",
 * que hoje agrega por esse campo, não por cantor_id.
 */
export function ArtistaTela({ artista, onBack, onSelectMusica }: Props) {
  const [musicas, setMusicas] = useState<Musica[]>([]);
  const [aba, setAba] = useState<Aba>('top');
  const [carregando, setCarregando] = useState(true);
  const { repertorios, adicionarMusica } = useRepertorios();

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    getMusicasPorArtista(artista).then((lista) => {
      if (!ativo) return;
      setMusicas(lista);
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [artista]);

  const alfabetico = useMemo(
    () => [...musicas].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
    [musicas]
  );

  function adicionar(repertorioId: string, musica: Musica, rito: string) {
    adicionarMusica(repertorioId, {
      musicaId: musica.id,
      title: musica.title,
      artist: musica.artist,
      tone: musica.originalTone,
      momento: rito,
    });
  }

  const lista = aba === 'top' ? musicas.slice(0, 10) : alfabetico;

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="flex flex-col items-center gap-3.5 bg-[var(--accent)] px-4 pb-[30px] pt-5 text-[var(--accent-fg)] lg:px-10">
        <button onClick={onBack} className="mb-1 flex w-full items-center gap-1 text-xs opacity-80">
          <ChevronLeft size={14} strokeWidth={2.75} /> Voltar
        </button>
        <span className="flex h-[112px] w-[112px] items-center justify-center rounded-full border-2 border-[var(--accent-fg)] bg-[var(--accent-fg)]/20 font-display text-[38px]">
          {artista.charAt(0).toUpperCase()}
        </span>
        <h1 className="text-[28px]">{artista}</h1>
      </header>

      <div className="mx-auto flex max-w-3xl border-b border-[var(--border)]">
        <button
          onClick={() => setAba('top')}
          className={`flex-1 py-3.5 text-center text-[14.5px] ${
            aba === 'top'
              ? 'border-b-[3px] border-[var(--accent)] font-bold text-[#3b4a27]'
              : 'font-semibold text-[var(--muted)]'
          }`}
        >
          Mais acessadas
        </button>
        <button
          onClick={() => setAba('todas')}
          className={`flex-1 py-3.5 text-center text-[14.5px] ${
            aba === 'todas'
              ? 'border-b-[3px] border-[var(--accent)] font-bold text-[#3b4a27]'
              : 'font-semibold text-[var(--muted)]'
          }`}
        >
          Ordem alfabética
        </button>
      </div>

      <div className="mx-auto max-w-3xl lg:my-[22px] lg:rounded-[24px] lg:border lg:border-[var(--border)]">
        {carregando && (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">carregando…</p>
        )}
        {!carregando &&
          lista.map((musica, i) => (
            <MusicaCard
              key={musica.id}
              musica={musica}
              posicao={aba === 'top' ? i + 1 : undefined}
              onClick={() => onSelectMusica(musica)}
              repertorios={repertorios}
              onAddToRepertorio={(repertorioId, rito) => adicionar(repertorioId, musica, rito)}
            />
          ))}
        {!carregando && lista.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
            Nenhuma cifra encontrada.
          </p>
        )}
      </div>
    </div>
  );
}
