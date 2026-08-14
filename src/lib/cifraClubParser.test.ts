import { describe, it, expect } from 'vitest';
import {
  marcarGrupoAlternativo,
  pareceLinhaDeAcordes,
  parseCifraClubTexto,
} from './cifraClubParser';

describe('marcarGrupoAlternativo', () => {
  it('marca tokens dentro de um grupo (...) que abre e fecha em tokens diferentes', () => {
    expect(marcarGrupoAlternativo(['A7', '(A', 'G#)', 'Bm'])).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });

  it('marca grupo que abre e fecha no mesmo token', () => {
    expect(marcarGrupoAlternativo(['(A)', 'G'])).toEqual([true, false]);
  });

  it('não marca acorde colado tipo Am7(9) — não começa com "("', () => {
    expect(marcarGrupoAlternativo(['Am7(9)', 'G'])).toEqual([false, false]);
  });
});

describe('pareceLinhaDeAcordes', () => {
  it('reconhece linha só com acordes espaçados', () => {
    expect(pareceLinhaDeAcordes('G        Em      C   D')).toBe(true);
  });

  it('rejeita linha de letra normal', () => {
    expect(pareceLinhaDeAcordes('Como são belos os pés')).toBe(false);
  });

  it('rejeita linha vazia', () => {
    expect(pareceLinhaDeAcordes('   ')).toBe(false);
  });

  it('reconhece linha de acordes mesmo com marcador de seção junto', () => {
    expect(pareceLinhaDeAcordes('[Intro] G Em')).toBe(true);
  });
});

describe('parseCifraClubTexto', () => {
  it('converte cabeçalho + acorde/letra intercalados para ChordPro', () => {
    const texto = [
      'Cifra Club',
      'Tom: G',
      '',
      '[Intro]',
      'G        Em',
      'Como são belos os pés',
      'C   D',
      'do mensageiro',
    ].join('\n');

    expect(parseCifraClubTexto(texto)).toBe(
      '[Intro]\n[G]Como são [Em]belos os pés\n[C]do m[D]ensageiro'
    );
  });

  it('descarta linha de afinação e linhas de metadado ignoradas', () => {
    const texto = 'Tom: G\nE A D G B E\nG\nIntro instrumental';
    expect(parseCifraClubTexto(texto)).toBe('[G]Intro instrumental');
  });

  it('descarta grupo de acorde alternativo "(...)" sem corromper o ChordPro', () => {
    expect(parseCifraClubTexto('A7 (A G#)\nletra aqui')).toBe('[A7]letra aqui');
  });

  it('linha de acordes sem letra seguinte vira progressão entre colchetes', () => {
    const texto = 'Tom: G\nG Em C D';
    expect(parseCifraClubTexto(texto)).toBe('[G] [Em] [C] [D]');
  });

  it('mantém marcador de seção intacto quando é a única coisa na linha', () => {
    const texto = 'Tom: G\n[Refrão]\nG\nletra';
    expect(parseCifraClubTexto(texto)).toBe('[Refrão]\n[G]letra');
  });
});
