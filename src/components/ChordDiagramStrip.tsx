import { EyeOff } from 'lucide-react';
import { buildChordDiagram } from '../lib/chordShapes';
import { ChordDiagramCard } from './ChordDiagramCard';

interface Props {
  chords: string[];
  onHide: () => void;
}

/**
 * No desktop os diagramas ficam na sidebar (`ChordDictionary`, hidden
 * lg:flex). No mobile não tinha nenhuma forma de ver os diagramas — esse
 * componente cobre isso com uma fileira horizontal rolável no topo da
 * cifra, compacta pra não dominar a tela pequena.
 */
export function ChordDiagramStrip({ chords, onHide }: Props) {
  const diagramas = chords.slice(0, 8).map(buildChordDiagram);

  if (diagramas.length === 0) return null;

  return (
    <div className="border-b border-[var(--border)] bg-[var(--surface)] lg:hidden">
      <div className="flex items-center justify-between px-4 pt-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
          Acordes
        </span>
        <button
          onClick={onHide}
          aria-label="Ocultar acordes"
          className="flex items-center gap-1 py-1 text-[10px] font-semibold text-[var(--muted)]"
        >
          <EyeOff size={12} /> ocultar
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-2.5 pt-1 [overscroll-behavior-x:contain]">
        {diagramas.map((diagram) => (
          <div key={diagram.name} className="shrink-0">
            <ChordDiagramCard diagram={diagram} compact />
          </div>
        ))}
      </div>
    </div>
  );
}
