'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';

export default function RegistroPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('COLABORADOR');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 5) {
      toast.error('A senha deve ter no mínimo 5 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      await register({ email, password, nome, role });
      toast.success('Conta criada com sucesso!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  const roleOptions = [
    { value: 'COLABORADOR', label: 'Colaborador' },
    { value: 'GESTOR', label: 'Gestor' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Image src="/logo.png" alt="Ouvidoria" width={80} height={80} className="object-contain" />
            <span className="font-display font-bold text-3xl">Ouvidoria</span>
          </div>
          <p className="text-neutral-600 font-medium">
            Crie sua conta na plataforma
          </p>
        </div>

        {/* Register Card */}
        <Card className="w-full">
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">Criar Conta</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type="text"
                label="Nome Completo"
                placeholder="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
              <User className="absolute right-4 top-10 w-5 h-5 text-neutral-400" />
            </div>

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

            <Select
              label="Tipo de Conta"
              options={roleOptions}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />

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

            <div className="relative">
              <Input
                type="password"
                label="Confirmar Senha"
                placeholder="********"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <Lock className="absolute right-4 top-10 w-5 h-5 text-neutral-400" />
            </div>

            <Button type="submit" loading={isLoading} className="w-full">
              Criar Conta
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-neutral-600">
              Já tem uma conta?{' '}
              <Link href="/login" className="font-bold text-primary-700 hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
