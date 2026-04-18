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
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-neutral-900 dark:text-neutral-100">
            Bem-vindo, {user?.nome?.split(' ')[0]}!
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 mt-1">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <Card className="bg-primary-50 dark:bg-primary-900/30">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary-500 border-3 border-neutral-900 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-300 uppercase">Gestores</p>
                    <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100">{data?.stats?.totalGestores || 0}</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-gold-50 dark:bg-gold-900/20">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gold-400 border-3 border-neutral-900 flex items-center justify-center shrink-0">
                    <Star className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-300 uppercase">Avaliações</p>
                    <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100">{data?.stats?.totalAvaliacoes || 0}</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-neutral-100 dark:bg-neutral-700">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-neutral-900 dark:bg-neutral-600 border-3 border-neutral-900 dark:border-neutral-500 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-300 uppercase">Suas Avaliações</p>
                    <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100">{data?.stats?.minhasContribuicoes || 0}</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Top Gestores */}
              <Card>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Award className="w-5 h-5 sm:w-6 sm:h-6 text-gold-500" />
                    Top Gestores
                  </CardTitle>
                  <Link href="/ranking">
                    <Button variant="outline" size="sm">
                      Ver Ranking <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
                <CardContent>
                  <div className="space-y-2 sm:space-y-4">
                    {data?.topGestores?.slice(0, 5).map((gestor: any, index: number) => (
                      <Link
                        key={gestor.id}
                        href={`/gestores/${gestor.id}`}
                        className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 border-2 border-neutral-200 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all"
                      >
                        <span className="w-7 h-7 sm:w-8 sm:h-8 bg-gold-400 border-2 border-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                          {index + 1}
                        </span>
                        <Avatar src={gestor.foto} alt={gestor.user?.nome} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">{gestor.user?.nome}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{gestor.cargo}</p>
                        </div>
                        <SimpleRating value={gestor.mediaAvaliacao} size="sm" />
                      </Link>
                    ))}

                    {(!data?.topGestores || data.topGestores.length === 0) && (
                      <p className="text-center text-neutral-500 dark:text-neutral-400 py-4 text-sm">
                        Nenhum gestor avaliado ainda
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Minhas Avaliações Recentes */}
              <Card>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Star className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" />
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
                  <div className="space-y-3 sm:space-y-4">
                    {data?.minhasAvaliacoes?.map((avaliacao: any) => (
                      <div key={avaliacao.id} className="p-3 sm:p-4 border-2 border-neutral-200 dark:border-neutral-700">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                            {avaliacao.gestor?.user?.nome}
                          </p>
                          <SimpleRating value={avaliacao.nota} size="sm" />
                        </div>
                        {avaliacao.elogio && (
                          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 italic">"{avaliacao.elogio}"</p>
                        )}
                        <p className="text-xs text-neutral-400 mt-2">
                          {format(new Date(avaliacao.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    ))}

                    {(!data?.minhasAvaliacoes || data.minhasAvaliacoes.length === 0) && (
                      <div className="text-center py-6 sm:py-8">
                        <Star className="w-10 h-10 sm:w-12 sm:h-12 text-neutral-300 mx-auto mb-3" />
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-6 sm:mt-8">
                <Link href="/avaliar">
                  <Card variant="hover" className="bg-primary-50 dark:bg-primary-900/30">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary-500 border-3 border-neutral-900 flex items-center justify-center shrink-0">
                        <Star className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100">Avaliar Gestor</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-300">Dê seu feedback sobre um gestor</p>
                      </div>
                      <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 ml-auto dark:text-neutral-100 shrink-0" />
                    </div>
                  </Card>
                </Link>

                <Link href="/ouvidoria">
                  <Card variant="hover" className="bg-red-50 dark:bg-red-900/20">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-400 border-3 border-neutral-900 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100">Ouvidoria</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-300">Registre uma denúncia confidencial</p>
                      </div>
                      <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 ml-auto dark:text-neutral-100 shrink-0" />
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
