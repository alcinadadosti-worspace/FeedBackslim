export enum Role {
  COLABORADOR = 'COLABORADOR',
  GESTOR = 'GESTOR',
  RH_ADMIN = 'RH_ADMIN'
}

export enum TipoDenuncia {
  ASSEDIO_MORAL = 'ASSEDIO_MORAL',
  COMPORTAMENTO_INADEQUADO = 'COMPORTAMENTO_INADEQUADO',
  ABUSO_AUTORIDADE = 'ABUSO_AUTORIDADE',
  OUTROS = 'OUTROS'
}

export enum StatusDenuncia {
  PENDENTE = 'PENDENTE',
  EM_ANALISE = 'EM_ANALISE',
  RESOLVIDA = 'RESOLVIDA',
  ARQUIVADA = 'ARQUIVADA'
}

export enum BadgeType {
  LIDER_INSPIRADOR = 'LIDER_INSPIRADOR',
  COMUNICADOR = 'COMUNICADOR',
  MENTOR = 'MENTOR',
  INOVADOR = 'INOVADOR',
  COLABORATIVO = 'COLABORATIVO'
}

export interface User {
  id: string;
  email: string;
  password: string;
  nome: string;
  role: Role;
  avatar?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Gestor {
  id: string;
  userId: string;
  cargo: string;
  departamento?: string | null;
  foto?: string | null;
  bio?: string | null;
  slackUserId?: string | null;
  mediaAvaliacao: number;
  totalAvaliacoes: number;
  elogiosCount?: number;
  sugestoesCount?: number;
  criticasCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Avaliacao {
  id: string;
  gestorId: string;
  autorId?: string | null;
  nota: number;
  elogio?: string | null;
  sugestao?: string | null;
  critica?: string | null;
  createdAt: Date;
}

export interface Denuncia {
  id: string;
  gestorId: string;
  autorId?: string | null;
  tipo: TipoDenuncia;
  descricao: string;
  anonima: boolean;
  status: StatusDenuncia;
  createdAt: Date;
  updatedAt: Date;
}

export interface Badge {
  id: string;
  gestorId: string;
  tipo: BadgeType;
  descricao: string;
  dataConquista: Date;
}
