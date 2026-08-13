import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { Musica } from '../types/musica';
import type { Cantor } from '../types/cantor';
import { getCantorBySlug, getTop10PorCantor, getTodasAlfabeticoPorCantor } from '../lib/cantoresApi';
import { useRepertorios } from '../lib/useRepertorios';
import { MusicaCard } from './MusicaCard';

type Aba = 'top' | 'todas';

interface Props {
  slug: string;
  onBack: () => void;
  onSelectMusica: (musica: Musica) => void;
}

/** Tela do cantor: foto, nome e suas cifras (mais acessadas / ordem alfabética). */
export function CantorTela({ slug, onBack, onSelectMusica }: Props) {
  const [cantor, setCantor] = useState<Cantor | null>(null);
  const [top10, setTop10] = useState<Musica[]>([]);
  const [todas, setTodas] = useState<Musica[]>([]);
  const [aba, setAba] = useState<Aba>('top');
  const [carregando, setCarregando] = useState(true);
  const { repertorios, adicionarMusica } = useRepertorios();

  useEffect(() => {
    let ativo = true;
    setCarregando(true);

    (async () => {
      const c = await getCantorBySlug(slug);
      if (!ativo) return;
      setCantor(c);

      if (c) {
        const [top, lista] = await Promise.all([
          getTop10PorCantor(c.id, c.slug),
          getTodasAlfabeticoPorCantor(c.id, c.slug),
        ]);
        if (!ativo) return;
        setTop10(top);
        setTodas(lista);
      }
      setCarregando(false);
    })();

    return () => {
      ativo = false;
    };
  }, [slug]);

  function adicionar(repertorioId: string, musica: Musica, rito: string) {
    adicionarMusica(repertorioId, {
      musicaId: musica.id,
      title: musica.title,
      artist: musica.artist,
      tone: musica.originalTone,
      momento: rito,
    });
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
        <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">carregando…</p>
      </div>
    );
  }

  if (!cantor) {
    return (
      <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
        <header className="bg-[var(--accent)] px-4 py-5 text-[var(--accent-fg)] lg:px-10 lg:pb-6">
          <button onClick={onBack} className="mb-2 flex items-center gap-1 text-xs opacity-80">
            <ChevronLeft size={14} strokeWidth={2.75} /> Voltar
          </button>
        </header>
        <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
          Cantor não encontrado.
        </p>
      </div>
    );
  }

  const lista = aba === 'top' ? top10 : todas;

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="flex flex-col items-center gap-3.5 bg-[var(--accent)] px-4 pb-[30px] pt-5 text-[var(--accent-fg)] lg:px-10">
        <button
          onClick={onBack}
          className="mb-1 flex w-full items-center gap-1 text-xs opacity-80"
        >
          <ChevronLeft size={14} strokeWidth={2.75} /> Voltar
        </button>
        {cantor.fotoUrl ? (
          <img
            src={cantor.fotoUrl}
            alt={cantor.nome}
            className="h-[112px] w-[112px] rounded-full border-2 border-[var(--accent-fg)] object-cover"
          />
        ) : (
          <span className="flex h-[112px] w-[112px] items-center justify-center rounded-full border-2 border-[var(--accent-fg)] bg-[var(--accent-fg)]/20 font-display text-[38px]">
            {cantor.nome.charAt(0).toUpperCase()}
          </span>
        )}
        <h1 className="text-[28px]">{cantor.nome}</h1>
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
        {lista.map((musica, i) => (
          <MusicaCard
            key={musica.id}
            musica={musica}
            posicao={aba === 'top' ? i + 1 : undefined}
            onClick={() => onSelectMusica(musica)}
            repertorios={repertorios}
            onAddToRepertorio={(repertorioId, rito) => adicionar(repertorioId, musica, rito)}
          />
        ))}
        {lista.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
            Nenhuma cifra encontrada.
          </p>
        )}
      </div>
    </div>
  );
}
