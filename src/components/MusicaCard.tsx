import type { Musica } from '../types/musica';
import { LABEL_MOMENTO } from '../lib/labels';
import type { Repertorio } from '../lib/repertorios';
import { AddToRepertorioMenu } from './AddToRepertorioMenu';

interface Props {
  musica: Musica;
  posicao?: number;
  onClick: () => void;
  repertorios?: Repertorio[];
  onAddToRepertorio?: (repertorioId: string) => void;
}

export function MusicaCard({
  musica,
  posicao,
  onClick,
  repertorios,
  onAddToRepertorio,
}: Props) {
  const mostrarMenu = repertorios !== undefined && onAddToRepertorio;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="flex w-full items-center gap-3 border-b border-[var(--border)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface)]"
    >
      {posicao !== undefined && (
        <span className="w-6 shrink-0 text-right font-mono text-sm text-[var(--muted)]">
          {posicao}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-[var(--text)]">{musica.title}</p>
        <p className="truncate text-xs text-[var(--muted)]">
          {musica.artist}
          {musica.momento[0] && <> · {LABEL_MOMENTO[musica.momento[0]]}</>}
        </p>
      </div>

      <span className="shrink-0 rounded-md bg-[var(--accent-soft)] px-2 py-1 font-mono text-xs font-bold text-[var(--accent)]">
        {musica.originalTone}
      </span>

      <span className="hidden w-14 shrink-0 text-right font-mono text-xs text-[var(--muted)] sm:block">
        {musica.viewsCount.toLocaleString('pt-BR')}
      </span>

      {mostrarMenu && (
        <AddToRepertorioMenu repertorios={repertorios} onAdd={onAddToRepertorio} />
      )}
    </div>
  );
}
