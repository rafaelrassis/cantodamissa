import { buildChordDiagram } from '../lib/chordShapes';
import { ChordDiagramCard } from './ChordDiagramCard';

interface Props {
  chords: string[];
}

export function ChordDictionary({ chords }: Props) {
  const diagrams = chords.slice(0, 6).map(buildChordDiagram);

  return (
    <aside className="hidden w-[292px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-5 md:flex">
      <div className="grid grid-cols-2 gap-x-3 gap-y-[18px]">
        {diagrams.map((diagram) => (
          <ChordDiagramCard key={diagram.name} diagram={diagram} />
        ))}
      </div>

      <div className="rounded-xl bg-[var(--accent-soft)] p-3 text-xs text-[var(--muted)]">
        No altar, prefira o modo de leitura sem distrações — os diagramas ajudam no ensaio.
      </div>
    </aside>
  );
}
