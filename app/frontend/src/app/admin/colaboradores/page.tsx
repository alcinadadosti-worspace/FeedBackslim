'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, UserPlus, Trash2, Search, Users, Hash } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loading } from '@/components/ui/Loading';
import { useAuthStore } from '@/store/auth';
import { colaboradoresAPI } from '@/lib/api';

interface Colaborador {
  slackId: string;
  nome: string;
}

const SLACK_ID_REGEX = /^U[A-Z0-9]{6,}$/i;

function sortByNome(list: Colaborador[]): Colaborador[] {
  return [...list].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export default function AdminColaboradoresPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [nome, setNome] = useState('');
  const [slackId, setSlackId] = useState('');
  const [nomeError, setNomeError] = useState('');
  const [slackIdError, setSlackIdError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Guarda de acesso: apenas RH_ADMIN
  useEffect(() => {
    if (user && user.role !== 'RH_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    loadColaboradores();
  }, []);

  const loadColaboradores = async () => {
    try {
      const response = await colaboradoresAPI.list();
      setColaboradores(sortByNome(response.data));
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
      toast.error('Erro ao carregar colaboradores');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    const nomeTrim = nome.trim();
    const slackIdTrim = slackId.trim();
    let valid = true;

    if (nomeTrim.length < 2) {
      setNomeError('Informe o nome completo');
      valid = false;
    } else {
      setNomeError('');
    }

    if (!SLACK_ID_REGEX.test(slackIdTrim)) {
      setSlackIdError('Slack ID inválido (deve começar com "U", ex: U0ABC12DEFG)');
      valid = false;
    } else {
      setSlackIdError('');
    }

    if (!valid) return;

    setSubmitting(true);
    try {
      const response = await colaboradoresAPI.create({ slackId: slackIdTrim, nome: nomeTrim });
      const novo: Colaborador = response.data;
      setColaboradores((prev) => sortByNome([...prev.filter((c) => c.slackId !== novo.slackId), novo]));
      setNome('');
      setSlackId('');
      toast.success(`${novo.nome} adicionado(a) com sucesso!`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao adicionar colaborador');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (colaborador: Colaborador) => {
    if (!window.confirm(`Remover "${colaborador.nome}" da lista de colaboradores?`)) return;

    setRemovingId(colaborador.slackId);
    try {
      await colaboradoresAPI.remove(colaborador.slackId);
      setColaboradores((prev) => prev.filter((c) => c.slackId !== colaborador.slackId));
      toast.success(`${colaborador.nome} removido(a).`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao remover colaborador');
    } finally {
      setRemovingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return colaboradores;
    return colaboradores.filter(
      (c) => c.nome.toLowerCase().includes(q) || c.slackId.toLowerCase().includes(q)
    );
  }, [colaboradores, search]);

  if (user && user.role !== 'RH_ADMIN') return null;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Painel
        </Link>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Users className="w-7 h-7 text-primary-600" />
            Colaboradores
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 mt-1">
            Cadastre ou remova colaboradores que podem receber feedbacks. As alterações valem
            imediatamente, sem precisar de deploy.
          </p>
        </div>

        {/* Adicionar */}
        <Card className="mb-6 sm:mb-8">
          <CardTitle className="flex items-center gap-2 mb-4 text-base sm:text-lg">
            <UserPlus className="w-5 h-5 text-primary-600" />
            Adicionar colaborador
          </CardTitle>
          <CardContent>
            <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <Input
                label="Nome completo"
                placeholder="Ex: Maria Fernanda Gomes"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                error={nomeError}
              />
              <Input
                label="Slack ID"
                placeholder="Ex: U0ABC12DEFG"
                value={slackId}
                onChange={(e) => setSlackId(e.target.value)}
                error={slackIdError}
              />
              <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center gap-3">
                <Button type="submit" loading={submitting} size="sm">
                  <UserPlus className="w-4 h-4" />
                  Adicionar
                </Button>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  No Slack: perfil da pessoa → <strong>Mais</strong> → <strong>Copiar ID do membro</strong>.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Lista */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <CardTitle className="text-base sm:text-lg">
              Lista de colaboradores
              {!loading && (
                <span className="ml-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                  ({colaboradores.length})
                </span>
              )}
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              <Input
                placeholder="Buscar por nome ou ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loading size="lg" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 py-8">
                {search ? 'Nenhum colaborador encontrado.' : 'Nenhum colaborador cadastrado.'}
              </p>
            ) : (
              <ul className="divide-y-2 divide-neutral-100 dark:divide-neutral-700">
                {filtered.map((c) => (
                  <li key={c.slackId} className="flex items-center gap-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                        {c.nome}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1 truncate">
                        <Hash className="w-3 h-3 shrink-0" />
                        {c.slackId}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(c)}
                      disabled={removingId === c.slackId}
                      className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={`Remover ${c.nome}`}
                      aria-label={`Remover ${c.nome}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
