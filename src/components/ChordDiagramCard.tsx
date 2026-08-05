import type { ChordDiagram } from '../lib/chordShapes';

interface Props {
  diagram: ChordDiagram;
}

export function ChordDiagramCard({ diagram }: Props) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <p className="font-mono text-sm font-bold text-[var(--chord)]">{diagram.name}</p>

      <div className="mt-2 grid grid-cols-6 text-center font-mono text-[9px] text-[var(--muted)]">
        {diagram.marks.map((mark, i) => (
          <span key={i}>{mark.s}</span>
        ))}
      </div>

      <div
        className="relative mt-1"
        style={{
          width: 76,
          height: 88,
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
              width: 15,
              height: 15,
              left: `${dot.left}%`,
              top: `${dot.top}%`,
              margin: '-8px 0 0 -8px',
            }}
          />
        ))}
      </div>

      {diagram.baseLabel && (
        <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">{diagram.baseLabel}</p>
      )}
    </div>
  );
}
