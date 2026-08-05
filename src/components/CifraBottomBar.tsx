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
    <div className="flex items-center justify-between gap-1.5 border-t border-[var(--border)] bg-[var(--surface)] px-4 pb-[26px] pt-3 lg:hidden">
      <button
        onClick={props.onDecTone}
        aria-label="Diminuir tom"
        className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
      >
        <Minus size={18} />
      </button>
      <div className="flex h-[52px] w-[60px] shrink-0 flex-col items-center justify-center rounded-2xl bg-[var(--accent-soft)]">
        <span className="font-mono text-sm font-bold text-[var(--accent)]">
          {props.currentTone}
        </span>
      </div>
      <button
        onClick={props.onIncTone}
        aria-label="Aumentar tom"
        className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
      >
        <Plus size={18} />
      </button>
      <button
        onClick={props.onTogglePlay}
        aria-label="Alternar rolagem automática"
        className="flex h-[52px] w-[60px] shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-fg)]"
      >
        {props.playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <button
        onClick={props.onDecFont}
        aria-label="Diminuir fonte"
        className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg)] text-sm font-semibold text-[var(--text)]"
      >
        A−
      </button>
      <button
        onClick={props.onIncFont}
        aria-label="Aumentar fonte"
        className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg)] text-sm font-semibold text-[var(--text)]"
      >
        A+
      </button>
      <button
        onClick={props.onToggleSheet}
        aria-label="Mais opções"
        className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border ${
          props.sheetOpen
            ? 'border-transparent bg-[var(--accent)] text-[var(--accent-fg)]'
            : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text)]'
        }`}
      >
        <MoreHorizontal size={20} />
      </button>
    </div>
  );
}
