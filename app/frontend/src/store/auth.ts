import { create } from 'zustand';
import { authAPI } from '@/lib/api';

interface User {
  id: string;
  email: string;
  nome: string;
  role: 'COLABORADOR' | 'GESTOR' | 'RH_ADMIN';
  avatar?: string;
  gestor?: {
    id: string;
    cargo: string;
    departamento?: string;
    bio?: string;
    foto?: string;
    slackUserId?: string;
    mediaAvaliacao: number;
    totalAvaliacoes: number;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; nome: string; role?: string }) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const response = await authAPI.login(email, password);
    const { user, token } = response.data;

    localStorage.setItem('pulse360_token', token);
    localStorage.setItem('pulse360_user', JSON.stringify(user));

    set({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  register: async (data) => {
    const response = await authAPI.register(data);
    const { user, token } = response.data;

    localStorage.setItem('pulse360_token', token);
    localStorage.setItem('pulse360_user', JSON.stringify(user));

    set({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    localStorage.removeItem('pulse360_token');
    localStorage.removeItem('pulse360_user');

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  loadUser: async () => {
    try {
      const token = localStorage.getItem('pulse360_token');
      const savedUser = localStorage.getItem('pulse360_user');

      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      // Tentar usar usuário salvo primeiro para carregamento rápido
      if (savedUser) {
        set({
          user: JSON.parse(savedUser),
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      }

      // Verificar token no servidor
      const response = await authAPI.me();
      const user = response.data;

      localStorage.setItem('pulse360_user', JSON.stringify(user));

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      localStorage.removeItem('pulse360_token');
      localStorage.removeItem('pulse360_user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  updateUser: (userData) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      localStorage.setItem('pulse360_user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    }
  },
}));
