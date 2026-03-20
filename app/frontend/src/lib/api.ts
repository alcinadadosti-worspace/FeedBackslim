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
    if (error.response?.status === 401) {
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
  list: (params?: { gestorId?: string; status?: string; tipo?: string; page?: number }) =>
    api.get('/denuncias', { params }),
  create: (data: any) => api.post('/denuncias', data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/denuncias/${id}/status`, { status }),
  stats: () => api.get('/denuncias/stats'),
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
