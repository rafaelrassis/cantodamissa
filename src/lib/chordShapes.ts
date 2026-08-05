import { CHROMATIC_FLAT, CHROMATIC_SHARP } from './chordpro';

/**
 * Geração dinâmica de diagramas de acorde (posições de casas/dedos), portada
 * do handoff de design. Cobre acordes abertos comuns via dicionário e gera
 * pestanas (barre) com base nas formas de E/A para os demais.
 */

const OPEN: Record<string, string> = {
  C: 'x32010', D: 'xx0232', E: '022100', F: '133211', G: '320003', A: 'x02220',
  Am: 'x02210', Em: '022000', Dm: 'xx0231', Bm: 'x24432', A7: 'x02020', D7: 'xx0212',
  E7: '020100', G7: '320001', C7: 'x32310', B7: 'x21202', Am7: 'x02010', Em7: '020000', Dm7: 'xx0211',
};

export interface ChordDiagram {
  name: string;
  marks: Array<{ s: string }>;
  dots: Array<{ left: number; top: number }>;
  baseLabel: string;
}

function normalizeChordName(name: string): string {
  const m = name.match(/^([A-G][#b]?)(.*)$/);
  if (!m) return name;
  let idx = CHROMATIC_FLAT.indexOf(m[1]);
  if (idx === -1) idx = CHROMATIC_SHARP.indexOf(m[1]);
  return (idx === -1 ? m[1] : CHROMATIC_SHARP[idx]) + m[2];
}

function shapeForChord(name: string): number[] | null {
  const key = normalizeChordName(name);
  if (OPEN[key]) {
    return OPEN[key].split('').map((c) => (c === 'x' ? -1 : parseInt(c, 10)));
  }

  const m = key.match(/^([A-G]#?)(.*)$/);
  if (!m) return null;
  const root = CHROMATIC_SHARP.indexOf(m[1]);
  if (root === -1) return null;
  const quality = m[2].replace('maj', '').replace('sus4', '').replace('sus2', '');

  const fretFromE = ((root - 4) % 12 + 12) % 12 || 12;
  const fretFromA = ((root - 9) % 12 + 12) % 12 || 12;

  if (fretFromE <= fretFromA) {
    const f = fretFromE;
    if (quality.indexOf('m7') === 0) return [f, f + 2, f, f, f, f];
    if (quality.indexOf('m') === 0) return [f, f + 2, f + 2, f, f, f];
    if (quality.indexOf('7') === 0) return [f, f + 2, f, f + 1, f, f];
    return [f, f + 2, f + 2, f + 1, f, f];
  }

  const f = fretFromA;
  if (quality.indexOf('m7') === 0) return [-1, f, f + 2, f, f + 1, f];
  if (quality.indexOf('m') === 0) return [-1, f, f + 2, f + 2, f + 1, f];
  if (quality.indexOf('7') === 0) return [-1, f, f + 2, f, f + 2, f];
  return [-1, f, f + 2, f + 2, f + 2, f];
}

export function buildChordDiagram(name: string): ChordDiagram {
  const shape = shapeForChord(name);
  if (!shape) return { name, marks: [], dots: [], baseLabel: '—' };

  const positive = shape.filter((f) => f > 0);
  const min = positive.length ? Math.min(...positive) : 1;
  const max = positive.length ? Math.max(...positive) : 1;
  const base = max > 4 ? min : 1;

  return {
    name,
    marks: shape.map((f) => ({ s: f < 0 ? '×' : f === 0 ? '○' : '' })),
    dots: shape
      .map((f, i) => (f > 0 ? { left: i * 20, top: (f - base + 0.5) * 25 } : null))
      .filter((d): d is { left: number; top: number } => d !== null),
    baseLabel: base > 1 ? `${base}ª casa` : '',
  };
}
