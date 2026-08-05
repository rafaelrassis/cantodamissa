/**
 * Engine ChordPro: parse de "[G]texto [Em]mais texto" e transposição cromática.
 *
 * Formato de entrada (chordsContent):
 *   "[G]Como são belos os [Em]pés do mensa[Am]geiro"
 *
 * Suporta acordes como: C, C#, Db, Cm, C7, Cmaj7, C#m7(9), Csus4, C/E (baixo invertido)
 */

const CHORD_REGEX = /\[([^\]]+)\]/g;

export const CHROMATIC_SHARP = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];
export const CHROMATIC_FLAT = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
];

const NOTE_TO_INDEX: Record<string, number> = {};
CHROMATIC_SHARP.forEach((n, i) => (NOTE_TO_INDEX[n] = i));
CHROMATIC_FLAT.forEach((n, i) => (NOTE_TO_INDEX[n] = i));

// captura a nota raiz de um acorde: "C#m7(9)" -> raiz "C#", resto "m7(9)"
// e opcionalmente baixo invertido: "C/E" -> raiz "C", resto "", baixo "E"
const CHORD_PARTS_REGEX = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/;

/**
 * Extrai a letra pura (sem marcações de acorde), útil pra busca full-text.
 */
export function extractLyrics(chordsContent: string): string {
  return chordsContent.replace(CHORD_REGEX, '').trim();
}

/**
 * Extrai a lista de acordes únicos usados na música, na ordem de aparição.
 */
export function extractChordsUsed(chordsContent: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(CHORD_REGEX);
  while ((match = regex.exec(chordsContent)) !== null) {
    const chord = match[1];
    if (!seen.has(chord)) {
      seen.add(chord);
      found.push(chord);
    }
  }
  return found;
}

/**
 * Transpõe um único acorde por N semitons.
 * useFlats: se true, prefere notação com bemol (Bb) ao invés de sustenido (A#)
 */
export function transposeChord(
  chord: string,
  semitones: number,
  useFlats = false
): string {
  if (semitones === 0) return chord;

  const match = chord.match(CHORD_PARTS_REGEX);
  if (!match) return chord; // não reconhecido, devolve como está

  const [, root, suffix, bass] = match;
  const newRoot = transposeNote(root, semitones, useFlats);
  const newBass = bass ? transposeNote(bass, semitones, useFlats) : undefined;

  return newBass ? `${newRoot}${suffix}/${newBass}` : `${newRoot}${suffix}`;
}

function transposeNote(note: string, semitones: number, useFlats: boolean): string {
  const index = NOTE_TO_INDEX[note];
  if (index === undefined) return note;
  const newIndex = ((index + semitones) % 12 + 12) % 12;
  return useFlats ? CHROMATIC_FLAT[newIndex] : CHROMATIC_SHARP[newIndex];
}

/**
 * Transpõe o chordsContent inteiro (todas as ocorrências [Acorde]) por N semitons.
 */
export function transposeContent(
  chordsContent: string,
  semitones: number,
  useFlats = false
): string {
  if (semitones === 0) return chordsContent;
  return chordsContent.replace(CHORD_REGEX, (_, chord) => {
    return `[${transposeChord(chord, semitones, useFlats)}]`;
  });
}

/**
 * Calcula a distância em semitons entre dois tons (ex: 'G' -> 'A' = 2).
 */
export function semitonesBetween(fromTone: string, toTone: string): number {
  const fromIndex = NOTE_TO_INDEX[fromTone];
  const toIndex = NOTE_TO_INDEX[toTone];
  if (fromIndex === undefined || toIndex === undefined) return 0;
  return toIndex - fromIndex;
}

/**
 * Parseia o chordsContent em linhas estruturadas prontas pra renderizar:
 * cada linha vira uma lista de tokens { chord?: string, text: string }
 * pra posicionar o acorde acima da sílaba correta na UI.
 */
export interface ChordToken {
  chord: string | null;
  text: string;
}

export function parseLineToTokens(line: string): ChordToken[] {
  const tokens: ChordToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(CHORD_REGEX);
  let pendingChord: string | null = null;

  while ((match = regex.exec(line)) !== null) {
    const textBefore = line.slice(lastIndex, match.index);
    if (textBefore) {
      tokens.push({ chord: pendingChord, text: textBefore });
      pendingChord = null;
    }
    pendingChord = match[1];
    lastIndex = regex.lastIndex;
  }

  const rest = line.slice(lastIndex);
  if (rest || pendingChord) {
    tokens.push({ chord: pendingChord, text: rest });
  }

  return tokens;
}

export interface StructuredLine {
  type: 'section' | 'chord-lyric' | 'blank';
  label: string;
  tokens: ChordToken[];
}

/**
 * Parseia o chordsContent inteiro em linhas estruturadas, distinguindo
 * marcadores de seção (linha iniciada por "#", ex: "#Refrão") de linhas de
 * cifra normais e linhas em branco (espaçamento entre blocos).
 */
export function parseContentToStructuredLines(chordsContent: string): StructuredLine[] {
  return chordsContent.split('\n').map((raw) => {
    if (raw.startsWith('#')) {
      return { type: 'section', label: raw.slice(1).trim(), tokens: [] };
    }
    if (!raw.trim()) {
      return { type: 'blank', label: '', tokens: [] };
    }
    return { type: 'chord-lyric', label: '', tokens: parseLineToTokens(raw) };
  });
}
