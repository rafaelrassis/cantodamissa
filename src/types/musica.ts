export type TempoLiturgico =
  | 'Advento'
  | 'Natal'
  | 'Quaresma'
  | 'Pascoa'
  | 'TempoComum';

export type CicloDominical = 'A' | 'B' | 'C';

export type MomentoMissa =
  | 'Entrada'
  | 'AtoPenitencial'
  | 'Gloria'
  | 'SalmoResponsorial'
  | 'AclamacaoEvangelho'
  | 'Ofertorio'
  | 'Santo'
  | 'Cordeiro'
  | 'Comunhao'
  | 'PosComunhao'
  | 'Envio';

export interface Musica {
  id: string;
  slug: string;
  title: string;
  artist: string | null;
  cantorId: string | null;
  originalTone: string;
  difficulty: number | null;
  capo: number;
  youtubeUrl: string | null;
  lyrics: string | null;
  chordsContent: string; // formato ChordPro: "[G]texto [Em]mais texto"
  viewsCount: number;
  tempoLiturgico: TempoLiturgico[];
  ciclo: CicloDominical[];
  momento: MomentoMissa[];
}
