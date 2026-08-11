import type { Musica } from '../types/musica';
import { LABEL_MOMENTO } from '../lib/labels';
import type { Repertorio } from '../lib/repertorios';
import { CifraOptionsMenu } from './CifraOptionsMenu';

interface Props {
  musica: Musica;
  posicao?: number;
  onClick: () => void;
  repertorios?: Repertorio[];
  onCriarRepertorio?: (nome: string) => Promise<Repertorio>;
  onAddToRepertorio?: (repertorioId: string, rito: string) => void;
}

export function MusicaCard({
  musica,
  posicao,
  onClick,
  repertorios,
  onCriarRepertorio,
  onAddToRepertorio,
}: Props) {
  const mostrarMenu = repertorios !== undefined && onCriarRepertorio && onAddToRepertorio;

  async function compartilhar() {
    const texto = `${musica.title}${musica.artist ? ` - ${musica.artist}` : ''} (tom ${musica.originalTone}) · Canto da Missa`;
    if (navigator.share) {
      try {
        await navigator.share({ title: musica.title, text: texto });
        return;
      } catch {
        // usuário cancelou o compartilhamento nativo — cai pro clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      window.prompt('Copie:', texto);
    }
  }

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

      <span className="hidden w-14 shrink-0 text-right font-mono text-xs text-[var(--muted)] sm:block">
        {musica.viewsCount.toLocaleString('pt-BR')}
      </span>

      {mostrarMenu && (
        <CifraOptionsMenu
          musica={musica}
          repertorios={repertorios}
          onCriarRepertorio={onCriarRepertorio}
          onAdicionarAoRepertorio={onAddToRepertorio}
          onCompartilhar={compartilhar}
        />
      )}
    </div>
  );
}
