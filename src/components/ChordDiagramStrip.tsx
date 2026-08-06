import { buildChordDiagram } from '../lib/chordShapes';
import { ChordDiagramCard } from './ChordDiagramCard';

interface Props {
  chords: string[];
}

/**
 * No desktop os diagramas ficam na sidebar (`ChordDictionary`, hidden
 * lg:flex). No mobile não tinha nenhuma forma de ver os diagramas — esse
 * componente cobre isso com uma fileira horizontal rolável no topo da
 * cifra, no mesmo espírito do padrão do Cifra Club.
 */
export function ChordDiagramStrip({ chords }: Props) {
  const diagramas = chords.slice(0, 8).map(buildChordDiagram);

  if (diagramas.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 lg:hidden">
      {diagramas.map((diagram) => (
        <div key={diagram.name} className="w-[92px] shrink-0">
          <ChordDiagramCard diagram={diagram} />
        </div>
      ))}
    </div>
  );
}
