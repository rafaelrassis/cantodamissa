// Tipos do domínio /ministério — schema real em supabase/migrations/0009_ministerio.sql.
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
  aniversario?: string; // ISO yyyy-mm-dd — usado só p/ dia e mês (tela Início)
};

export type StatusConfirmacao = 'pendente' | 'confirmado' | 'recusado';

export type ParticipanteEscala = {
  membroId: string;
  funcaoId: string;
  status: StatusConfirmacao;
};

// tipo 'evento' = item manual (Título/Descrição/Duração/Ícone);
// tipo 'musica' = espelha uma entrada de ItemRepertorio (lib/repertorios.ts),
// adicionada automaticamente com base no Repertorio vinculado à escala
// (não editável direto aqui — ver itensRoteiroComMusicas).
// Campos opcionais mantêm compatibilidade com itens antigos do mock
// (só horario+descricao, sem tipo).
export type ItemRoteiro = {
  id: string;
  tipo?: 'evento' | 'musica';
  titulo?: string;
  descricao?: string;
  duracaoSegundos?: number;
  icone?: string;
  horario?: string; // "19:00" — legado
  musicaId?: string;
  tom?: string;
  momento?: string;
};

export type Escala = {
  id: string;
  titulo: string;
  data: string; // ISO yyyy-mm-dd
  hora: string; // "19:00"
  observacoes: string;
  publicada: boolean;
  solicitarConfirmacao: boolean;
  corPaleta?: string; // id de PALETAS_CORES (ministerioUtils.ts)
  participantes: ParticipanteEscala[];
  // Músicas NÃO ficam mais aqui — a escala pode ter um Repertorio real
  // vinculado por escalaId (ver lib/repertorios.ts,
  // useRepertorios().garantirRepertorioDaEscala). "musicas" existiu antes
  // como lista paralela solta; unificado pra evitar dois sistemas
  // divergentes representando a mesma coisa.
  roteiro: ItemRoteiro[]; // só os itens manuais (tipo 'evento')
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

export type Equipe = {
  id: string;
  nome: string;
  membroIds: string[];
};

// Só itens tipo 'evento' — mesma regra do roteiro da Escala (músicas são
// derivadas do Repertorio, nunca fazem parte de um modelo salvo).
export type ModeloRoteiro = {
  id: string;
  nome: string;
  itens: ItemRoteiro[];
};
