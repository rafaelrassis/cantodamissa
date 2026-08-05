const PREFIX = 'cifra:';

export interface ReaderState {
  semitones: number;
  capo: number;
  flats: boolean;
}

/**
 * Estado do leitor (tom, capo, grafia) persistido por música — o músico
 * volta à mesma música no mesmo tom (SPEC.md §"State Management").
 */
export function loadReaderState(slug: string, defaults: ReaderState): ReaderState {
  try {
    const raw = localStorage.getItem(PREFIX + slug);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveReaderState(slug: string, state: ReaderState): void {
  localStorage.setItem(PREFIX + slug, JSON.stringify(state));
}
