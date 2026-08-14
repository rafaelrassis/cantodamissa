import { describe, it, expect } from 'vitest';
import {
  pareceAcorde,
  extractLyrics,
  extractChordsUsed,
  transposeChord,
  transposeContent,
  semitonesBetween,
  parseLineToTokens,
  parseContentToStructuredLines,
  gerarOpcoesDeTom,
  semitonesEntreAcordes,
} from './chordpro';

describe('pareceAcorde', () => {
  it('aceita acordes válidos', () => {
    expect(pareceAcorde('C')).toBe(true);
    expect(pareceAcorde('C#m7')).toBe(true);
    expect(pareceAcorde('Ebmaj7')).toBe(true);
    expect(pareceAcorde('G7M')).toBe(true);
    expect(pareceAcorde('C#m7(9)')).toBe(true);
    expect(pareceAcorde('C/E')).toBe(true);
    expect(pareceAcorde('Bsus4')).toBe(true);
  });

  it('rejeita marcadores de seção', () => {
    expect(pareceAcorde('Intro')).toBe(false);
    expect(pareceAcorde('Refrão')).toBe(false);
    expect(pareceAcorde('2x')).toBe(false);
  });
});

describe('extractLyrics', () => {
  it('remove marcações de acorde mantendo o texto', () => {
    expect(extractLyrics('[G]Como são belos os [Em]pés')).toBe('Como são belos os pés');
  });
});

describe('extractChordsUsed', () => {
  it('extrai acordes únicos na ordem de aparição, ignorando seções', () => {
    const content = '[Intro] [G] [Em]\n[G]Como são belos os [Em]pés do [G]mensageiro';
    expect(extractChordsUsed(content)).toEqual(['G', 'Em']);
  });
});

describe('transposeChord', () => {
  it('transpõe raiz simples', () => {
    expect(transposeChord('C', 2)).toBe('D');
    expect(transposeChord('G', -2)).toBe('F');
  });

  it('preserva sufixo (qualidade do acorde)', () => {
    expect(transposeChord('C#m7(9)', 1)).toBe('Dm7(9)');
  });

  it('transpõe baixo invertido', () => {
    expect(transposeChord('C/E', 2)).toBe('D/F#');
  });

  it('usa bemol quando useFlats=true', () => {
    expect(transposeChord('C', 1, true)).toBe('Db');
    expect(transposeChord('C', 1, false)).toBe('C#');
  });

  it('faz wraparound na oitava', () => {
    expect(transposeChord('B', 1)).toBe('C');
    expect(transposeChord('C', -1)).toBe('B');
  });

  it('semitones=0 retorna o mesmo acorde', () => {
    expect(transposeChord('C#m7(9)', 0)).toBe('C#m7(9)');
  });

  it('acorde não reconhecido retorna como está', () => {
    expect(transposeChord('XYZ', 2)).toBe('XYZ');
  });
});

describe('transposeContent', () => {
  it('transpõe todas as ocorrências no texto', () => {
    const content = '[G]Como são belos os [Em]pés do mensa[Am]geiro';
    expect(transposeContent(content, 2)).toBe(
      '[A]Como são belos os [F#m]pés do mensa[Bm]geiro'
    );
  });

  it('semitones=0 retorna o conteúdo original sem alterações', () => {
    const content = '[G]texto';
    expect(transposeContent(content, 0)).toBe(content);
  });
});

describe('semitonesBetween', () => {
  it('calcula distância positiva e negativa corretamente', () => {
    expect(semitonesBetween('G', 'A')).toBe(2);
    expect(semitonesBetween('A', 'G')).toBe(-2);
    expect(semitonesBetween('C', 'C')).toBe(0);
  });

  it('retorna 0 para nota inválida', () => {
    expect(semitonesBetween('X', 'C')).toBe(0);
  });
});

describe('parseLineToTokens', () => {
  it('associa acorde ao texto seguinte', () => {
    const tokens = parseLineToTokens('[G]Como [Em]são belos');
    expect(tokens).toEqual([
      { chord: 'G', text: 'Como ' },
      { chord: 'Em', text: 'são belos' },
    ]);
  });

  it('mescla acordes consecutivos sem texto real entre eles (riff)', () => {
    // G e G9 mesclam (só espaço entre eles); G4 já carrega a letra
    // seguinte, então vira token próprio
    const tokens = parseLineToTokens('[G] [G9] [G4] letra');
    expect(tokens).toEqual([
      { chord: 'G G9', text: ' ' },
      { chord: 'G4', text: ' letra' },
    ]);
  });

  it('mescla toda a progressão quando não há letra alguma na linha', () => {
    const tokens = parseLineToTokens('[G] [G9] [G4]');
    expect(tokens).toEqual([{ chord: 'G G9 G4', text: ' ' }]);
  });

  it('linha sem acordes retorna um único token de texto', () => {
    const tokens = parseLineToTokens('apenas texto');
    expect(tokens).toEqual([{ chord: null, text: 'apenas texto' }]);
  });
});

describe('parseContentToStructuredLines', () => {
  it('classifica linha de seção', () => {
    const [line] = parseContentToStructuredLines('#Refrão');
    expect(line).toMatchObject({ type: 'section', label: 'Refrão' });
  });

  it('classifica linha em branco', () => {
    const [line] = parseContentToStructuredLines('');
    expect(line.type).toBe('blank');
  });

  it('classifica progressão de acordes sem letra', () => {
    const [line] = parseContentToStructuredLines('[Intro] [E] [A9] [C#m7]');
    expect(line.type).toBe('chord-progression');
    expect(line.label).toBe('Intro');
    expect(line.chords).toEqual(['E', 'A9', 'C#m7']);
  });

  it('classifica linha normal de cifra+letra', () => {
    const [line] = parseContentToStructuredLines('[G]Como são belos');
    expect(line.type).toBe('chord-lyric');
  });
});

describe('gerarOpcoesDeTom', () => {
  it('mantém o sufixo (qualidade) em todas as opções', () => {
    const opcoes = gerarOpcoesDeTom('F#m');
    expect(opcoes).toHaveLength(12);
    expect(opcoes[0]).toBe('Cm');
    expect(opcoes).toContain('F#m');
    opcoes.forEach((o) => expect(o.endsWith('m')).toBe(true));
  });

  it('usa bemol quando useFlats=true', () => {
    const opcoes = gerarOpcoesDeTom('C', true);
    expect(opcoes).toContain('Db');
    expect(opcoes).not.toContain('C#');
  });
});

describe('semitonesEntreAcordes', () => {
  it('considera só a nota raiz, ignorando sufixo', () => {
    expect(semitonesEntreAcordes('F#m', 'Bm')).toBe(semitonesBetween('F#', 'B'));
  });

  it('retorna 0 para acorde inválido', () => {
    expect(semitonesEntreAcordes('XYZ', 'C')).toBe(0);
  });
});
