'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Star, AlertTriangle, TrendingUp, Award, ArrowRight } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, BadgeIcon } from '@/components/ui/Badge';
import { SimpleRating } from '@/components/ui/Rating';
import { Loading } from '@/components/ui/Loading';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth';
import { dashboardAPI } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await dashboardAPI.colaborador();
      setData(response.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-neutral-900">
            Bem-vindo, {user?.nome?.split(' ')[0]}!
          </h1>
          <p className="text-neutral-600 mt-1">
            Acompanhe os feedbacks e avalie os gestores da empresa
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loading size="lg" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-primary-50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary-500 border-3 border-neutral-900 flex items-center justify-center">
                    <Users className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-600 uppercase">Gestores</p>
                    <p className="text-3xl font-bold text-neutral-900">{data?.stats?.totalGestores || 0}</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-gold-50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gold-400 border-3 border-neutral-900 flex items-center justify-center">
                    <Star className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-600 uppercase">Avaliações</p>
                    <p className="text-3xl font-bold text-neutral-900">{data?.stats?.totalAvaliacoes || 0}</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-neutral-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-neutral-900 border-3 border-neutral-900 flex items-center justify-center">
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-600 uppercase">Suas Avaliações</p>
                    <p className="text-3xl font-bold text-neutral-900">{data?.stats?.minhasContribuicoes || 0}</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Gestores */}
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-6 h-6 text-gold-500" />
                    Top Gestores
                  </CardTitle>
                  <Link href="/ranking">
                    <Button variant="outline" size="sm">
                      Ver Ranking <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
                <CardContent>
                  <div className="space-y-4">
                    {data?.topGestores?.slice(0, 5).map((gestor: any, index: number) => (
                      <Link
                        key={gestor.id}
                        href={`/gestores/${gestor.id}`}
                        className="flex items-center gap-4 p-3 border-2 border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 transition-all"
                      >
                        <span className="w-8 h-8 bg-gold-400 border-2 border-neutral-900 flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                        <Avatar src={gestor.foto} alt={gestor.user?.nome} size="sm" />
                        <div className="flex-1">
                          <p className="font-semibold text-neutral-900">{gestor.user?.nome}</p>
                          <p className="text-sm text-neutral-500">{gestor.cargo}</p>
                        </div>
                        <SimpleRating value={gestor.mediaAvaliacao} size="sm" />
                      </Link>
                    ))}

                    {(!data?.topGestores || data.topGestores.length === 0) && (
                      <p className="text-center text-neutral-500 py-4">
                        Nenhum gestor avaliado ainda
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Minhas Avaliações Recentes */}
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-6 h-6 text-primary-500" />
                    Minhas Avaliações Recentes
                  </CardTitle>
                  {user?.role === 'COLABORADOR' && (
                    <Link href="/avaliar">
                      <Button variant="primary" size="sm">
                        Avaliar <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </div>
                <CardContent>
                  <div className="space-y-4">
                    {data?.minhasAvaliacoes?.map((avaliacao: any) => (
                      <div
                        key={avaliacao.id}
                        className="p-4 border-2 border-neutral-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-neutral-900">
                            {avaliacao.gestor?.user?.nome}
                          </p>
                          <SimpleRating value={avaliacao.nota} size="sm" />
                        </div>
                        {avaliacao.elogio && (
                          <p className="text-sm text-neutral-600 italic">"{avaliacao.elogio}"</p>
                        )}
                        <p className="text-xs text-neutral-400 mt-2">
                          {format(new Date(avaliacao.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    ))}

                    {(!data?.minhasAvaliacoes || data.minhasAvaliacoes.length === 0) && (
                      <div className="text-center py-8">
                        <Star className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                        <p className="text-neutral-500 mb-4">
                          Você ainda não fez nenhuma avaliação
                        </p>
                        {user?.role === 'COLABORADOR' && (
                          <Link href="/avaliar">
                            <Button variant="primary" size="sm">
                              Fazer primeira avaliação
                            </Button>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            {user?.role === 'COLABORADOR' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <Link href="/avaliar">
                  <Card variant="hover" className="bg-primary-50">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-primary-500 border-3 border-neutral-900 flex items-center justify-center">
                        <Star className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-neutral-900">Avaliar Gestor</h3>
                        <p className="text-neutral-600">Dê seu feedback sobre um gestor</p>
                      </div>
                      <ArrowRight className="w-6 h-6 ml-auto" />
                    </div>
                  </Card>
                </Link>

                <Link href="/ouvidoria">
                  <Card variant="hover" className="bg-red-50">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-red-400 border-3 border-neutral-900 flex items-center justify-center">
                        <AlertTriangle className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-neutral-900">Ouvidoria</h3>
                        <p className="text-neutral-600">Registre uma denúncia confidencial</p>
                      </div>
                      <ArrowRight className="w-6 h-6 ml-auto" />
                    </div>
                  </Card>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
