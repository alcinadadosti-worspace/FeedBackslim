'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Star, ThumbsUp, Lightbulb, AlertCircle, TrendingUp, Eye, EyeOff } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { BadgeIcon } from '@/components/ui/Badge';
import { SimpleRating } from '@/components/ui/Rating';
import { Loading } from '@/components/ui/Loading';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth';
import { avaliacoesAPI, dashboardAPI } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSearchParams } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export default function GestorDashboardPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPublic, setUpdatingPublic] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const id = searchParams.get('avaliacao');
    if (!id) return;
    if (!data?.avaliacoesRecentes?.length) return;
    const exists = data.avaliacoesRecentes.some((a: any) => a.id === id);
    if (!exists) return;
    setTimeout(() => {
      const el = document.getElementById(`avaliacao-${id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [searchParams, data]);

  const loadDashboard = async () => {
    try {
      const response = await dashboardAPI.gestor();
      setData(response.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const setAvaliacaoPublica = async (avaliacaoId: string, publica: boolean) => {
    setUpdatingPublic((prev) => ({ ...prev, [avaliacaoId]: true }));
    try {
      const resp = await avaliacoesAPI.setPublica(avaliacaoId, publica);
      setData((prev: any) => {
        if (!prev?.avaliacoesRecentes) return prev;
        return {
          ...prev,
          avaliacoesRecentes: prev.avaliacoesRecentes.map((a: any) => (a.id === avaliacaoId ? { ...a, ...resp.data } : a))
        };
      });
    } catch (error) {
      console.error('Erro ao atualizar visibilidade:', error);
    } finally {
      setUpdatingPublic((prev) => ({ ...prev, [avaliacaoId]: false }));
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-12">
          <Loading size="lg" />
        </div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-neutral-500">Você não possui um perfil de gestor</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-neutral-100">Meu Dashboard</h1>
          <p className="text-neutral-600 dark:text-neutral-300 mt-1">
            Acompanhe suas avaliações e feedbacks
          </p>
        </div>

        {/* Profile Summary */}
        <Card className="mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar src={data.gestor?.foto || user?.avatar} alt={user?.nome} size="xl" />
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{user?.nome}</h2>
              <p className="text-neutral-600 dark:text-neutral-300">{data.gestor?.cargo}</p>
              {data.gestor?.departamento && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{data.gestor.departamento}</p>
              )}

              {data.gestor?.badges?.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                  {data.gestor.badges.map((badge: any) => (
                    <BadgeIcon key={badge.id} type={badge.tipo} />
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gold-50 dark:bg-gold-900/20 border-2 border-neutral-900 dark:border-neutral-100">
                <Star className="w-8 h-8 text-gold-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                  {data.gestor?.mediaAvaliacao?.toFixed(1) || '0.0'}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">Média</p>
              </div>
              <div className="text-center p-4 bg-primary-50 dark:bg-primary-900/30 border-2 border-neutral-900 dark:border-neutral-100">
                <BarChart3 className="w-8 h-8 text-primary-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                  {data.gestor?.totalAvaliacoes || 0}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">Avaliações</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center gap-4">
              <ThumbsUp className="w-10 h-10 text-green-600" />
              <div>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{data.feedbackStats?.elogios || 0}</p>
                <p className="text-neutral-600 dark:text-neutral-300">Elogios</p>
              </div>
            </div>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center gap-4">
              <Lightbulb className="w-10 h-10 text-blue-600" />
              <div>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{data.feedbackStats?.sugestoes || 0}</p>
                <p className="text-neutral-600 dark:text-neutral-300">Sugestões</p>
              </div>
            </div>
          </Card>

          <Card className="bg-orange-50 dark:bg-orange-900/20">
            <div className="flex items-center gap-4">
              <AlertCircle className="w-10 h-10 text-orange-600" />
              <div>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{data.feedbackStats?.criticas || 0}</p>
                <p className="text-neutral-600 dark:text-neutral-300">Críticas</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Evolução das Avaliações */}
          <Card>
            <CardTitle className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-6 h-6 text-primary-600" />
              Evolução das Avaliações
            </CardTitle>
            <CardContent>
              {data.evolucao?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.evolucao}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="media"
                      stroke="#98d4a0"
                      strokeWidth={3}
                      dot={{ fill: '#98d4a0', strokeWidth: 2, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">
                  Dados insuficientes para gerar o gráfico
                </p>
              )}
            </CardContent>
          </Card>

          {/* Feedbacks por Tipo */}
          <Card>
            <CardTitle className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-6 h-6 text-primary-600" />
              Feedbacks por Tipo
            </CardTitle>
            <CardContent>
              {data.evolucao?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.evolucao}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="elogios" name="Elogios" fill="#86efac" />
                    <Bar dataKey="sugestoes" name="Sugestões" fill="#93c5fd" />
                    <Bar dataKey="criticas" name="Críticas" fill="#fdba74" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">
                  Dados insuficientes para gerar o gráfico
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Avaliações Recentes */}
        <Card className="mt-8">
          <CardTitle className="flex items-center gap-2 mb-6">
            <Star className="w-6 h-6 text-gold-500" />
            Avaliações Recentes
          </CardTitle>
          <CardContent>
            <div className="space-y-4">
              {data.avaliacoesRecentes?.map((avaliacao: any) => (
                <div key={avaliacao.id} id={`avaliacao-${avaliacao.id}`} className="p-4 border-2 border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between mb-3 gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={null} alt={avaliacao.autor?.nome} size="sm" />
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {avaliacao.autor?.nome || 'Colaborador'}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {format(new Date(avaliacao.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <SimpleRating value={avaliacao.nota} />
                      <Button
                        variant={avaliacao.publica !== false ? 'secondary' : 'outline'}
                        size="sm"
                        loading={!!updatingPublic[avaliacao.id]}
                        onClick={() => setAvaliacaoPublica(avaliacao.id, avaliacao.publica === false)}
                      >
                        {avaliacao.publica !== false ? (
                          <>
                            <Eye className="w-4 h-4" />
                            Público
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4" />
                            Privado
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {avaliacao.elogio && (
                      <p className="text-sm dark:text-neutral-300">
                        <span className="font-semibold text-green-700 dark:text-green-400">Elogio:</span>{' '}
                        {avaliacao.elogio}
                      </p>
                    )}
                    {avaliacao.sugestao && (
                      <p className="text-sm dark:text-neutral-300">
                        <span className="font-semibold text-blue-700 dark:text-blue-400">Sugestão:</span>{' '}
                        {avaliacao.sugestao}
                      </p>
                    )}
                    {avaliacao.critica && (
                      <p className="text-sm dark:text-neutral-300">
                        <span className="font-semibold text-orange-700 dark:text-orange-400">Crítica:</span>{' '}
                        {avaliacao.critica}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {(!data.avaliacoesRecentes || data.avaliacoesRecentes.length === 0) && (
                <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">
                  Você ainda não recebeu avaliações
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
