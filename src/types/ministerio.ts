// Tipos usados apenas pelo mock de /ministério (src/lib/mockMinisterio.ts).
// Não têm relação com o schema do Supabase — servem só pra validar UX antes
// de desenhar as tabelas reais (ver conversa no chat "refinar repertório").

export type FuncaoMinisterio = {
  id: string;
  nome: string;
  icone: string; // emoji, mesmo padrão da tela "Nova Função" do LouveApp
};

export type MembroMinisterio = {
  id: string;
  nome: string;
  avatarCor: string; // classe tailwind de bg, ex: 'bg-rose-500'
  funcoes: string[]; // ids de FuncaoMinisterio
  admin?: boolean;
};

export type StatusConfirmacao = 'pendente' | 'confirmado' | 'recusado';

export type ParticipanteEscala = {
  membroId: string;
  funcaoId: string;
  status: StatusConfirmacao;
};

export type ItemRoteiro = {
  id: string;
  horario: string; // "19:00"
  descricao: string;
};

export type EscalaMusica = {
  musicaId: string;
  tom: string;
  momento: string; // texto livre, ex: "Entrada"
};

export type Escala = {
  id: string;
  titulo: string;
  data: string; // ISO yyyy-mm-dd
  hora: string; // "19:00"
  observacoes: string;
  publicada: boolean;
  solicitarConfirmacao: boolean;
  participantes: ParticipanteEscala[];
  musicas: EscalaMusica[];
  roteiro: ItemRoteiro[];
};

export type Indisponibilidade = {
  id: string;
  membroId: string;
  data: string; // ISO yyyy-mm-dd
  motivo: string;
};

export type Aviso = {
  id: string;
  titulo: string;
  descricao: string;
  emDestaque: boolean;
  arquivado: boolean;
  criadoEm: string;
};

export type SolicitacaoIngresso = {
  id: string;
  nome: string;
  codigoUsado: string;
};
