import axios from 'axios';

// In unified deployment, API is served from same origin at /api
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ouvidoria_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Senha errada no login também volta 401: aí só mostra o erro, sem recarregar a página
    const ehTentativaDeLogin = String(error.config?.url || '').includes('/auth/login');
    if (error.response?.status === 401 && !ehTentativaDeLogin) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ouvidoria_token');
        localStorage.removeItem('ouvidoria_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; nome: string; role?: string }) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// Gestores endpoints
export const gestoresAPI = {
  list: () => api.get('/gestores'),
  getById: (id: string) => api.get(`/gestores/${id}`),
  ranking: () => api.get('/gestores/ranking'),
  update: (id: string, data: any) => api.put(`/gestores/${id}`, data),
  create: (data: any) => api.post('/gestores', data),
  getStats: (id: string) => api.get(`/gestores/${id}/stats`),
};

// Avaliações endpoints
export const avaliacoesAPI = {
  listPublicas: (params?: { page?: number; limit?: number }) => api.get('/avaliacoes/publicas', { params }),
  list: (params?: { gestorId?: string; page?: number; limit?: number }) =>
    api.get('/avaliacoes', { params }),
  create: (data: {
    gestorId: string;
    nota: number;
    elogio?: string;
    sugestao?: string;
    critica?: string;
  }) => api.post('/avaliacoes', data),
  getById: (id: string) => api.get(`/avaliacoes/${id}`),
  setPublica: (id: string, publica: boolean) => api.patch(`/avaliacoes/${id}/publica`, { publica }),
};

// Denúncias endpoints
export const denunciasAPI = {
  list: (params?: { gestorId?: string; status?: string; tipo?: string; page?: number; limit?: number }) =>
    api.get('/denuncias', { params }),
  getById: (id: string) => api.get(`/denuncias/${id}`),
  create: (data: any) => api.post('/denuncias', data),
  updateStatus: (id: string, status: string, comentarioRH?: string) =>
    api.patch(`/denuncias/${id}/status`, { status, comentarioRH }),
  stats: () => api.get('/denuncias/stats'),
  consultar: (codigo: string) => api.get(`/denuncias/consultar/${codigo}`),
};

// Histórico e provas da denúncia
export interface ItemHistoricoDenuncia {
  id: string;
  tipo: 'COMENTARIO' | 'STATUS';
  texto: string;
  autorNome?: string | null; // só vem para o RH
  createdAt: string;
}

export interface ProvaDenuncia {
  id: string;
  nome: string;
  mimeType: string;
  tamanho: number;
  categoria: 'IMAGEM' | 'VIDEO';
  createdAt?: string;
}

// Lado do RH: usa o login do admin
export const denunciaAndamentoAPI = {
  historico: (denunciaId: string) =>
    api.get<{ data: ItemHistoricoDenuncia[] }>(`/denuncias/${denunciaId}/historico`),
  comentar: (denunciaId: string, texto: string) =>
    api.post<ItemHistoricoDenuncia>(`/denuncias/${denunciaId}/comentarios`, { texto }),
  provas: (denunciaId: string) =>
    api.get<{ data: ProvaDenuncia[] }>(`/denuncias/${denunciaId}/anexos`),
  baixarProva: (denunciaId: string, anexoId: string) =>
    api.get<Blob>(`/denuncias/${denunciaId}/anexos/${anexoId}`, { responseType: 'blob' }),
};

// Envio de provas pelo denunciante logo após registrar a denúncia. Instância separada:
// sem o login de usuário e sem redirecionar para /login. O acesso é pelo token que
// vem na resposta da criação da denúncia (vale por 1 hora).
const provasPublicoApi = axios.create({ baseURL: API_URL });

export const provasDenunciaAPI = {
  enviar: (tokenAnexos: string, arquivo: File, onProgress?: (percentual: number) => void) => {
    const form = new FormData();
    form.append('arquivo', arquivo);
    return provasPublicoApi.post('/denuncias/anexos', form, {
      headers: { Authorization: `Bearer ${tokenAnexos}` },
      onUploadProgress: onProgress
        ? (e) => {
            if (e.total) onProgress(Math.round((e.loaded / e.total) * 100));
          }
        : undefined,
    });
  },
};

// Dashboard endpoints
export const dashboardAPI = {
  colaborador: () => api.get('/dashboard/colaborador'),
  gestor: () => api.get('/dashboard/gestor'),
  admin: (periodo?: number) => api.get('/dashboard/admin', { params: { periodo } }),
  export: (tipo: string, formato?: string) =>
    api.get('/dashboard/export', {
      params: { tipo, formato },
      responseType: formato === 'xlsx' ? 'arraybuffer' : 'json'
    }),
};

// Colaboradores endpoints
export const colaboradoresAPI = {
  list: () => api.get('/colaboradores'),
  create: (data: { slackId: string; nome: string }) => api.post('/colaboradores', data),
  remove: (slackId: string) => api.delete(`/colaboradores/${encodeURIComponent(slackId)}`),
};

// Feedbacks para colaboradores
export const feedbacksColaboradorAPI = {
  create: (data: {
    colaboradorSlackId: string;
    nota: number;
    elogio?: string;
    sugestao?: string;
    critica?: string;
  }) => api.post('/feedbacks/colaborador', data),
  listTodosPublicos: (params?: { page?: number; limit?: number }) => api.get('/feedbacks/colaborador/publicos', { params }),
  listPublicos: (slackId: string) => api.get(`/feedbacks/colaborador/publicos/${slackId}`),
  ranking: () => api.get('/feedbacks/colaborador/ranking'),
};

// Upload endpoint
export const uploadAPI = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
