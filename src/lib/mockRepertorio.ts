/**
 * Dados mock para os painéis de repertório (sidebar do leitor + "Meus
 * repertórios" na Home). Só visual por enquanto — o módulo de repertório
 * real (persistência, membros, compartilhamento) é trabalho futuro.
 */

export interface RepertorioItem {
  momento: string;
  title: string;
  tone: string;
}

export const REPERTORIO_ATUAL: { nome: string; itens: RepertorioItem[] } = {
  nome: '4º Domingo',
  itens: [
    { momento: 'Entrada', title: 'Povo de Deus', tone: 'G' },
    { momento: 'Ato Penitencial', title: 'Senhor, Tende Piedade', tone: 'D' },
    { momento: 'Glória', title: 'Glória a Deus nas Alturas', tone: 'C' },
    { momento: 'Ofertório', title: 'Recebe, ó Pai', tone: 'E' },
    { momento: 'Santo', title: 'Santo, Santo, Santo', tone: 'F' },
    { momento: 'Comunhão', title: 'Vem, Espírito de Deus', tone: 'D' },
    { momento: 'Final', title: 'Ide em Paz', tone: 'G' },
  ],
};

export interface Playlist {
  id: string;
  nome: string;
  meta: string;
  contador: string;
}

export const MOCK_PLAYLISTS: Playlist[] = [
  { id: '1', nome: '4º Dom. Tempo Comum', meta: '7 músicas · 3 membros', contador: '7' },
  { id: '2', nome: 'Vigília Pascal', meta: '9 músicas · compartilhado', contador: '9' },
  { id: '3', nome: 'Casamento — Ana & João', meta: '5 músicas · rascunho', contador: '5' },
];
