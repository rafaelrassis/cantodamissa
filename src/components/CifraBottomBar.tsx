import { MoreHorizontal, Minus, Pause, Play, Plus } from 'lucide-react';

interface Props {
  currentTone: string;
  onDecTone: () => void;
  onIncTone: () => void;
  playing: boolean;
  onTogglePlay: () => void;
  onDecFont: () => void;
  onIncFont: () => void;
  sheetOpen: boolean;
  onToggleSheet: () => void;
}

export function CifraBottomBar(props: Props) {
  return (
    <div className="flex items-center justify-between gap-1 border-t border-[var(--border)] bg-[var(--surface)] px-3 pb-[22px] pt-2 lg:hidden">
      <div className="flex items-center gap-1">
        <button
          onClick={props.onDecTone}
          aria-label="Diminuir tom"
          className="flex h-11 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
        >
          <Minus size={16} />
        </button>
        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--accent-soft)]">
          <span className="font-mono text-sm font-bold leading-none text-[var(--accent)]">
            {props.currentTone}
          </span>
          <span className="text-[8px] font-semibold uppercase tracking-wide text-[var(--accent)]">
            Tom
          </span>
        </div>
        <button
          onClick={props.onIncTone}
          aria-label="Aumentar tom"
          className="flex h-11 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
        >
          <Plus size={16} />
        </button>
      </div>

      <BarraBotao
        onClick={props.onTogglePlay}
        label="Rolagem"
        ariaLabel="Alternar rolagem automática"
        destaque
      >
        {props.playing ? <Pause size={17} /> : <Play size={17} />}
      </BarraBotao>

      <div className="flex items-center gap-1">
        <button
          onClick={props.onDecFont}
          aria-label="Diminuir fonte"
          className="flex h-11 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold text-[var(--text)]"
        >
          A−
        </button>
        <button
          onClick={props.onIncFont}
          aria-label="Aumentar fonte"
          className="flex h-11 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold text-[var(--text)]"
        >
          A+
        </button>
      </div>

      <BarraBotao
        onClick={props.onToggleSheet}
        label="Mais"
        ariaLabel="Mais opções"
        ativo={props.sheetOpen}
      >
        <MoreHorizontal size={18} />
      </BarraBotao>
    </div>
  );
}

function BarraBotao({
  children,
  label,
  ariaLabel,
  onClick,
  destaque,
  ativo,
}: {
  children: React.ReactNode;
  label: string;
  ariaLabel: string;
  onClick: () => void;
  destaque?: boolean;
  ativo?: boolean;
}) {
  const ativado = destaque || ativo;
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`flex h-11 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl ${
        ativado
          ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
          : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]'
      }`}
    >
      {children}
      <span className="text-[8px] font-semibold uppercase tracking-wide">{label}</span>
    </button>
  );
}
