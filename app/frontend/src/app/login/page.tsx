'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function LoginPage() {
  const router = useRouter();
  const { login, logout, user, isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isSwitch = params.get('switch') === '1';
    if (isSwitch) {
      logout();
      return;
    }
    loadUser();
  }, [loadUser, logout]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const role = user?.role;
      if (role === 'RH_ADMIN') {
        router.push('/admin');
        return;
      }
      if (role === 'GESTOR') {
        router.push('/dashboard/gestor');
        return;
      }
      router.push('/dashboard');
    }
  }, [authLoading, isAuthenticated, router, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Login realizado com sucesso!');
      const role = useAuthStore.getState().user?.role;
      if (role === 'RH_ADMIN') {
        router.push('/admin');
        return;
      }
      if (role === 'GESTOR') {
        router.push('/dashboard/gestor');
        return;
      }
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para inicio
        </Link>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary-500 border-3 border-neutral-900 shadow-brutal flex items-center justify-center">
              <span className="font-bold text-2xl">O</span>
            </div>
            <span className="font-display font-bold text-3xl">Ouvidoria</span>
          </div>
          <p className="text-neutral-600 font-medium">
            Plataforma de Feedback para Gestores
          </p>
        </div>

        {/* Login Card */}
        <Card className="w-full">
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">Entrar</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type="email"
                label="Email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail className="absolute right-4 top-10 w-5 h-5 text-neutral-400" />
            </div>

            <div className="relative">
              <Input
                type="password"
                label="Senha"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock className="absolute right-4 top-10 w-5 h-5 text-neutral-400" />
            </div>

            <Button type="submit" loading={isLoading} className="w-full">
              Entrar
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-neutral-600">
              Não tem uma conta?{' '}
              <Link href="/registro" className="font-bold text-primary-700 hover:underline">
                Registre-se
              </Link>
            </p>
          </div>
        </Card>

        {/* Demo Credentials */}
        <Card className="mt-4 bg-neutral-100">
          <h3 className="font-bold text-sm mb-2">Credenciais de Demo:</h3>
          <div className="text-sm text-neutral-600 space-y-1">
            <p><strong>Admin:</strong> admin@pulse360.com</p>
            <p><strong>Gestor:</strong> carlos.silva@pulse360.com</p>
            <p><strong>Colaborador:</strong> joao.pereira@pulse360.com</p>
            <p className="text-xs mt-2">Senha: 123456</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
