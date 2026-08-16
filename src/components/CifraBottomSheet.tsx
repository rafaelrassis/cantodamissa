import { FileText, Minus, Moon, Music, Plus, Share2, Sun, Sunrise } from 'lucide-react';
import type { Theme } from '../lib/useTheme';
import type { Repertorio } from '../lib/repertorios';
import type { Musica } from '../types/musica';
import { AddToRepertorioMenu } from './AddToRepertorioMenu';

interface Props {
  open: boolean;
  speed: number;
  onSpeedChange: (speed: number) => void;
  capoLabel: string;
  onIncCapo: () => void;
  onDecCapo: () => void;
  diagrams: boolean;
  onToggleDiagrams: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  awakeActive: boolean;
  awakeSupported: boolean;
  onToggleAwake: () => void;
  musica: Musica;
  repertorios: Repertorio[];
  onAddToRepertorio: (repertorioId: string, rito: string) => void;
  onCompartilhar: () => void;
  /** true = mostrando só letra. Alterna e some com capo/diagramas. */
  modoLetra: boolean;
  onToggleModoLetra: () => void;
}

export function CifraBottomSheet(props: Props) {
  return (
    <div
      className={`fixed inset-x-0 z-20 rounded-t-[22px] border-t border-[var(--border)] bg-[var(--surface)] p-5 pb-7 shadow-[0_-18px_40px_rgba(0,0,0,0.14)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden ${
        props.open ? 'translate-y-0' : 'translate-y-[130%]'
      }`}
      style={{ bottom: 86 }}
    >
      <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-[var(--border)]" />

      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
        Velocidade da rolagem
      </p>
      <div className="mb-4 flex items-center gap-2 text-[11px] text-[var(--muted)]">
        <span>lento</span>
        <input
          type="range"
          min={1}
          max={10}
          value={props.speed}
          onChange={(e) => props.onSpeedChange(Number(e.target.value))}
          className="h-1 flex-1 accent-[var(--accent)]"
        />
        <span>rápido</span>
      </div>

      {!props.modoLetra && (
        <>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
            Capotraste
          </p>
          <div className="mb-4 flex h-12 items-center gap-2">
            <button
              onClick={props.onDecCapo}
              aria-label="Diminuir capo"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
            >
              <Minus size={18} />
            </button>
            <div className="flex h-12 flex-1 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] font-mono text-sm text-[var(--text)]">
              {props.capoLabel}
            </div>
            <button
              onClick={props.onIncCapo}
              aria-label="Aumentar capo"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
            >
              <Plus size={18} />
            </button>
          </div>
        </>
      )}

      <div className="mb-4 flex gap-2">
        <SheetToggle active={props.modoLetra} onClick={props.onToggleModoLetra}>
          {props.modoLetra ? <FileText size={16} /> : <Music size={16} />}
          {props.modoLetra ? 'só letra' : 'cifra completa'}
        </SheetToggle>
        <SheetToggle active={props.theme === 'dark'} onClick={props.onToggleTheme}>
          {props.theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          {props.theme === 'dark' ? 'modo escuro' : 'modo claro'}
        </SheetToggle>
      </div>

      {!props.modoLetra && (
        <div className="mb-4 flex gap-2">
          <SheetToggle active={props.diagrams} onClick={props.onToggleDiagrams}>
            {props.diagrams ? 'acordes visíveis' : 'acordes ocultos'}
          </SheetToggle>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
        <span className="text-sm font-medium text-[var(--text)]">Adicionar ao repertório</span>
        <AddToRepertorioMenu
          musica={props.musica}
          repertorios={props.repertorios}
          onAdd={props.onAddToRepertorio}
        />
      </div>

      <button
        onClick={props.onCompartilhar}
        className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm font-semibold text-[var(--text)]"
      >
        <Share2 size={16} /> Compartilhar
      </button>

      {props.awakeSupported && (
        <button
          onClick={props.onToggleAwake}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold ${
            props.awakeActive
              ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
              : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]'
          }`}
        >
          <Sunrise size={16} />
          {props.awakeActive ? 'tela sempre acesa · ativo' : 'manter tela acesa'}
        </button>
      )}
    </div>
  );
}

function SheetToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-semibold ${
        active
          ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
          : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]'
      }`}
    >
      {children}
    </button>
  );
}
