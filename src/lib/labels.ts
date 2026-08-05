import type { MomentoMissa, TempoLiturgico } from '../types/musica';

export const LABEL_TEMPO: Record<TempoLiturgico, string> = {
  Advento: 'Advento',
  Natal: 'Natal',
  Quaresma: 'Quaresma',
  Pascoa: 'Páscoa',
  TempoComum: 'Tempo Comum',
};

export const LABEL_MOMENTO: Record<MomentoMissa, string> = {
  Entrada: 'Entrada',
  AtoPenitencial: 'Ato Penitencial',
  Gloria: 'Glória',
  SalmoResponsorial: 'Salmo Responsorial',
  AclamacaoEvangelho: 'Aclamação ao Evangelho',
  Ofertorio: 'Ofertório',
  Santo: 'Santo',
  Cordeiro: 'Cordeiro de Deus',
  Comunhao: 'Comunhão',
  PosComunhao: 'Pós-Comunhão',
  Envio: 'Envio',
};
