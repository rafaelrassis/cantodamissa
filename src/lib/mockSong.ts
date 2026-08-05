import type { Musica } from '../types/musica';

export const mockSong: Musica = {
  id: '1',
  slug: 'como-sao-belos',
  title: 'Como São Belos',
  artist: 'Pe. Zezinho, SCJ',
  originalTone: 'G',
  difficulty: 2,
  capo: 0,
  youtubeUrl: 'https://www.youtube.com/watch?v=EXEMPLO',
  lyrics: null,
  viewsCount: 1420,
  tempoLiturgico: ['TempoComum'],
  ciclo: ['A', 'B', 'C'],
  momento: ['Entrada', 'Envio'],
  chordsContent: `[G]Como são belos sobre os montes os [Em]pés
do mensa[Am]geiro que anuncia a [D7]paz
Que anuncia a [G]paz, que anuncia o [Em]bem
que anuncia a [C]salvação e [D7]diz a Sião: o teu Deus [G]reina

[C]Eis que o Senhor volta a Si[G]ão
E os olhos [Em]d'Ele estão sobre [Am]nós [D7]
[C]Prorrompei em canto de a[G]legria
Pois o Senhor con[Em]sola o seu [D7]povo`,
};
