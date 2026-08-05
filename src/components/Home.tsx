import { useEffect, useMemo, useState } from 'react';
import type { Musica, MomentoMissa, TempoLiturgico } from '../types/musica';
import { getTop50, searchMusicas } from '../lib/musicasApi';
import { domingoMaisProximo } from '../lib/liturgicalCalendar';
import { LABEL_TEMPO, LABEL_MOMENTO } from '../lib/labels';
import { MusicaCard } from './MusicaCard';

interface Props {
  onSelectMusica: (musica: Musica) => void;
}

const TEMPOS: TempoLiturgico[] = ['Advento', 'Natal', 'Quaresma', 'Pascoa', 'TempoComum'];
const MOMENTOS: MomentoMissa[] = [
  'Entrada',
  'AtoPenitencial',
  'Gloria',
  'SalmoResponsorial',
  'AclamacaoEvangelho',
  'Ofertorio',
  'Santo',
  'Cordeiro',
  'Comunhao',
  'PosComunhao',
  'Envio',
];

export function Home({ onSelectMusica }: Props) {
  const [query, setQuery] = useState('');
  const [tempo, setTempo] = useState<TempoLiturgico | undefined>();
  const [momento, setMomento] = useState<MomentoMissa | undefined>();
  const [resultados, setResultados] = useState<Musica[]>([]);
  const [carregando, setCarregando] = useState(true);

  const domingoAtual = useMemo(() => domingoMaisProximo(new Date()), []);
  const buscando = query.trim().length > 0;

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    const filtro = { tempo, momento };
    const promise = buscando ? searchMusicas(query, filtro) : getTop50(filtro);
    promise.then((lista) => {
      if (!cancelado) {
        setResultados(lista);
        setCarregando(false);
      }
    });
    return () => {
      cancelado = true;
    };
  }, [query, tempo, momento, buscando]);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans">
      {/* Header com banner do domingo atual */}
      <header className="bg-brand-green px-4 pb-5 pt-4 text-white">
        <h1 className="text-xl font-bold tracking-tight">Canto da Missa</h1>
        <p className="mt-0.5 text-sm text-white/80">
          {domingoAtual.nome} · Ciclo {domingoAtual.ciclo} · {LABEL_TEMPO[domingoAtual.tempo]}
        </p>

        {/* Busca */}
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2.5">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0 text-white/70"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título ou artista..."
            className="w-full bg-transparent text-sm text-white placeholder:text-white/60 focus:outline-none"
          />
        </div>
      </header>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto border-b border-neutral-100 px-4 py-3">
        <FiltroChip
          ativo={tempo === undefined}
          label="Todos os tempos"
          onClick={() => setTempo(undefined)}
        />
        {TEMPOS.map((t) => (
          <FiltroChip
            key={t}
            ativo={tempo === t}
            label={LABEL_TEMPO[t]}
            onClick={() => setTempo(tempo === t ? undefined : t)}
          />
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto border-b border-neutral-100 px-4 py-2">
        {MOMENTOS.map((m) => (
          <FiltroChip
            key={m}
            ativo={momento === m}
            label={LABEL_MOMENTO[m]}
            onClick={() => setMomento(momento === m ? undefined : m)}
            pequeno
          />
        ))}
      </div>

      {/* Lista */}
      <div className="flex-1">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-500">
            {buscando ? `Resultados para "${query}"` : 'Top 50 mais acessadas'}
          </h2>
          {carregando && <span className="text-xs text-neutral-400">carregando…</span>}
        </div>

        {!carregando && resultados.length === 0 && (
          <div className="px-4 py-10 text-center text-neutral-400">
            Nenhuma música encontrada. Tente outro termo ou remova os filtros.
          </div>
        )}

        {resultados.map((musica, i) => (
          <MusicaCard
            key={musica.id}
            musica={musica}
            posicao={buscando ? undefined : i + 1}
            onClick={() => onSelectMusica(musica)}
          />
        ))}
      </div>

      {/* Slot de anúncio — só aparece na Home, nunca no leitor */}
      <footer
        id="ad-slot"
        className="sticky bottom-0 flex h-14 items-center justify-center border-t border-neutral-200 bg-white text-xs text-neutral-400"
      >
        espaço reservado para anúncio
      </footer>
    </div>
  );
}

function FiltroChip({
  label,
  ativo,
  onClick,
  pequeno,
}: {
  label: string;
  ativo: boolean;
  onClick: () => void;
  pequeno?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 font-medium transition-colors ${
        pequeno ? 'py-1 text-xs' : 'py-1.5 text-sm'
      } ${
        ativo
          ? 'border-brand-green bg-brand-green text-white'
          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
      }`}
    >
      {label}
    </button>
  );
}
