import type { ChordDiagram } from '../lib/chordShapes';

interface Props {
  diagram: ChordDiagram;
  compact?: boolean;
}

export function ChordDiagramCard({ diagram, compact }: Props) {
  const largura = compact ? 52 : 76;
  const altura = compact ? 60 : 88;
  const dotSize = compact ? 10 : 15;

  return (
    <div
      className={`rounded-[16px] border border-[var(--border)] ${compact ? 'px-[10px] py-2' : 'p-[10px]'}`}
    >
      <p
        className={`font-mono font-bold text-[var(--chord)] ${compact ? 'text-xs' : 'text-[13px]'}`}
      >
        {diagram.name}
      </p>

      {!compact && (
        <div className="mt-2 grid grid-cols-6 text-center font-mono text-[9px] text-[var(--muted)]">
          {diagram.marks.map((mark, i) => (
            <span key={i}>{mark.s}</span>
          ))}
        </div>
      )}

      <div
        className="relative mt-1"
        style={{
          width: largura,
          height: altura,
          borderTop: '3px solid var(--text)',
          borderRight: '1px solid var(--muted)',
          borderBottom: '1px solid var(--muted)',
          backgroundImage:
            'repeating-linear-gradient(to right, var(--muted) 0 1px, transparent 1px 20%), repeating-linear-gradient(to bottom, var(--muted) 0 1px, transparent 1px 25%)',
        }}
      >
        {diagram.dots.map((dot, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-[var(--accent)]"
            style={{
              width: dotSize,
              height: dotSize,
              left: `${dot.left}%`,
              top: `${dot.top}%`,
              margin: `${-dotSize / 2}px 0 0 ${-dotSize / 2}px`,
            }}
          />
        ))}
      </div>

      {diagram.baseLabel && (
        <p
          className={`mt-1 font-mono text-[var(--muted)] ${compact ? 'text-[8px]' : 'text-[10px]'}`}
        >
          {diagram.baseLabel}
        </p>
      )}
    </div>
  );
}
