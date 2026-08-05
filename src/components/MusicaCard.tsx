import type { Musica } from '../types/musica';
import { LABEL_MOMENTO } from '../lib/labels';

const COR_TEMPO: Record<string, string> = {
  Advento: 'bg-liturgico-advento',
  Quaresma: 'bg-liturgico-quaresma',
  Pascoa: 'bg-liturgico-pascoa',
  Natal: 'bg-liturgico-natal',
  TempoComum: 'bg-liturgico-comum',
};

interface Props {
  musica: Musica;
  posicao?: number;
  onClick: () => void;
}

export function MusicaCard({ musica, posicao, onClick }: Props) {
  const tempoPrincipal = musica.tempoLiturgico[0];

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-neutral-100 px-4 py-3 text-left transition-colors hover:bg-brand-green-light/40 active:bg-brand-green-light"
    >
      {posicao !== undefined && (
        <span className="w-6 shrink-0 text-right font-mono text-sm text-neutral-300">
          {posicao}
        </span>
      )}

      <span
        className={`h-8 w-1 shrink-0 rounded-full ${COR_TEMPO[tempoPrincipal] ?? 'bg-neutral-200'}`}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-neutral-900">{musica.title}</p>
        <p className="truncate text-sm text-neutral-500">
          {musica.artist}
          {musica.momento[0] && (
            <span className="text-neutral-400"> · {LABEL_MOMENTO[musica.momento[0]]}</span>
          )}
        </p>
      </div>

      <span className="shrink-0 rounded-md bg-neutral-100 px-2 py-1 font-mono text-xs font-semibold text-neutral-600">
        {musica.originalTone}
      </span>
    </button>
  );
}
