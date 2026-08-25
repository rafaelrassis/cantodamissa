import { FileText } from 'lucide-react';
import type { Musica } from '../types/musica';
import { LABEL_MOMENTO } from '../lib/labels';
import type { Repertorio } from '../lib/repertorios';
import { saveModoExibicao } from '../lib/modoExibicao';
import { CifraOptionsMenu } from './CifraOptionsMenu';

interface Props {
  musica: Musica;
  posicao?: number;
  onClick: () => void;
  repertorios?: Repertorio[];
  onAddToRepertorio?: (repertorioId: string, rito: string) => void;
}

export function MusicaCard({
  musica,
  posicao,
  onClick,
  repertorios,
  onAddToRepertorio,
}: Props) {
  const mostrarMenu = repertorios !== undefined && onAddToRepertorio;

  // atalho pra abrir direto só na letra — grava a preferência antes de
  // navegar, então o CifraReader já abre nesse modo (ver lib/modoExibicao)
  function abrirEmModoLetra(e: React.MouseEvent) {
    e.stopPropagation();
    saveModoExibicao(musica.id, 'letra');
    onClick();
  }

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
      data-testid="musica-card"
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
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[15px] font-semibold text-[var(--text)]">{musica.title}</p>
          <button
            onClick={abrirEmModoLetra}
            aria-label="Ver só a letra"
            title="Ver só a letra"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)]"
          >
            <FileText size={13} />
          </button>
        </div>
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
          onAdicionarAoRepertorio={onAddToRepertorio}
          onCompartilhar={compartilhar}
        />
      )}
    </div>
  );
}
