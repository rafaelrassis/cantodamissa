import { Minus, Pause, Play, Plus } from 'lucide-react';
import { REPERTORIO_ATUAL } from '../lib/mockRepertorio';

interface Props {
  currentTone: string;
  semitonesLabel: string;
  onIncTone: () => void;
  onDecTone: () => void;
  onResetTone: () => void;
  flats: boolean;
  onToggleFlats: () => void;
  capoLabel: string;
  onIncCapo: () => void;
  onDecCapo: () => void;
  playing: boolean;
  onTogglePlay: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  fontSize: number;
  onIncFont: () => void;
  onDecFont: () => void;
  currentTitle: string;
}

export function CifraToolsSidebar(props: Props) {
  return (
    <aside className="hidden w-[272px] shrink-0 flex-col gap-[22px] overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] p-5 lg:flex">
      <ToolSection label="Tom">
        <div className="flex items-center gap-2">
          <SquareButton onClick={props.onDecTone} aria-label="Diminuir tom">
            <Minus size={18} />
          </SquareButton>
          <div className="flex h-11 flex-1 flex-col items-center justify-center rounded-[11px] bg-[var(--accent-soft)]">
            <span className="font-mono text-base font-bold text-[var(--accent)]">
              {props.currentTone}
            </span>
            <span className="text-[11px] font-medium text-[var(--muted)]">
              {props.semitonesLabel}
            </span>
          </div>
          <SquareButton onClick={props.onIncTone} aria-label="Aumentar tom">
            <Plus size={18} />
          </SquareButton>
        </div>
        <div className="mt-2 flex gap-2">
          <SecondaryButton onClick={props.onToggleFlats}>
            {props.flats ? '♭ bemol' : '♯ sustenido'}
          </SecondaryButton>
          <SecondaryButton onClick={props.onResetTone}>tom original</SecondaryButton>
        </div>
      </ToolSection>

      <ToolSection label="Capotraste">
        <div className="flex h-10 items-center gap-2">
          <SquareButton small onClick={props.onDecCapo} aria-label="Diminuir capo">
            <Minus size={16} />
          </SquareButton>
          <div className="flex h-10 flex-1 items-center justify-center rounded-[11px] border border-[var(--border)] bg-[var(--bg)] font-mono text-sm text-[var(--text)]">
            {props.capoLabel}
          </div>
          <SquareButton small onClick={props.onIncCapo} aria-label="Aumentar capo">
            <Plus size={16} />
          </SquareButton>
        </div>
      </ToolSection>

      <ToolSection label="Rolagem automática">
        <button
          onClick={props.onTogglePlay}
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${
            props.playing
              ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
              : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] hover:bg-[var(--surface2)]'
          }`}
        >
          {props.playing ? <Pause size={16} /> : <Play size={16} />}
          {props.playing ? 'pausar rolagem' : 'rolar automático'}
        </button>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--muted)]">
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
      </ToolSection>

      <ToolSection label="Tamanho do texto">
        <div className="flex h-10 items-center gap-2">
          <SquareButton small onClick={props.onDecFont} aria-label="Diminuir fonte">
            A−
          </SquareButton>
          <div className="flex h-10 flex-1 items-center justify-center font-mono text-sm text-[var(--text)]">
            {props.fontSize}
          </div>
          <SquareButton small onClick={props.onIncFont} aria-label="Aumentar fonte">
            A+
          </SquareButton>
        </div>
      </ToolSection>

      <div className="h-px bg-[var(--border)]" />

      <ToolSection label={`Repertório · ${REPERTORIO_ATUAL.nome}`}>
        <div className="flex flex-col gap-1.5">
          {REPERTORIO_ATUAL.itens.map((item) => {
            const active = item.title === props.currentTitle;
            return (
              <div
                key={item.title}
                className={`flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2 ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-transparent bg-[var(--bg)]'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--muted)]">
                    {item.momento}
                  </p>
                  <p className="truncate text-[13px] font-semibold text-[var(--text)]">
                    {item.title}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs font-bold text-[var(--accent)]">
                  {item.tone}
                </span>
              </div>
            );
          })}
        </div>
      </ToolSection>
    </aside>
  );
}

function ToolSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </h3>
      {children}
    </section>
  );
}

function SquareButton({
  children,
  onClick,
  small,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  small?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center justify-center rounded-[11px] border border-[var(--border)] bg-[var(--bg)] font-mono text-[var(--accent)] hover:bg-[var(--accent-soft)] ${
        small ? 'h-8 w-8 text-xs' : 'h-11 w-11'
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="h-[34px] flex-1 rounded-[10px] border border-[var(--border)] bg-[var(--bg)] font-mono text-xs text-[var(--text)] hover:bg-[var(--surface2)]"
    >
      {children}
    </button>
  );
}
