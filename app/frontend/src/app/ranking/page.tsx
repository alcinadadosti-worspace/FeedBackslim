'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Star, Users, UserCheck } from 'lucide-react';
import { SmartLayout } from '@/components/layout/SmartLayout';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { BadgeIcon } from '@/components/ui/Badge';
import { SimpleRating } from '@/components/ui/Rating';
import { Loading } from '@/components/ui/Loading';
import { gestoresAPI, feedbacksColaboradorAPI } from '@/lib/api';

type Tab = 'gestores' | 'colaboradores';

export default function RankingPage() {
  const [tab, setTab] = useState<Tab>('gestores');
  const [gestores, setGestores] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [gestoresRes, colaboradoresRes] = await Promise.allSettled([
        gestoresAPI.ranking(),
        feedbacksColaboradorAPI.ranking(),
      ]);
      if (gestoresRes.status === 'fulfilled') setGestores(gestoresRes.value.data);
      if (colaboradoresRes.status === 'fulfilled') setColaboradores(colaboradoresRes.value.data);
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalColor = (position: number) => {
    switch (position) {
      case 0: return 'bg-yellow-400 text-yellow-900';
      case 1: return 'bg-neutral-300 text-neutral-700';
      case 2: return 'bg-amber-600 text-amber-100';
      default: return 'bg-neutral-100 text-neutral-600';
    }
  };

  const ColaboradorInitial = ({ nome, size = 'md' }: { nome: string; size?: 'md' | 'lg' | 'xl' }) => {
    const sizes = { md: 'w-10 h-10 text-base', lg: 'w-14 h-14 text-lg', xl: 'w-20 h-20 text-2xl' };
    return (
      <div className={`${sizes[size]} bg-neutral-200 dark:bg-neutral-600 border-2 border-neutral-900 dark:border-neutral-100 flex items-center justify-center font-bold text-neutral-700 dark:text-neutral-100`}>
        {nome.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <SmartLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gold-400 border-3 border-neutral-900 shadow-brutal mb-4">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-display font-bold text-neutral-900">Ranking</h1>
          <p className="text-neutral-600 mt-2">Os mais bem avaliados da empresa</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 p-1 bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => setTab('gestores')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 font-semibold text-sm transition-colors ${
              tab === 'gestores'
                ? 'bg-white dark:bg-neutral-700 border-2 border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Gestores
          </button>
          <button
            onClick={() => setTab('colaboradores')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 font-semibold text-sm transition-colors ${
              tab === 'colaboradores'
                ? 'bg-white dark:bg-neutral-700 border-2 border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Colaboradores
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loading size="lg" />
          </div>
        ) : tab === 'gestores' ? (
          /* ---- RANKING GESTORES ---- */
          gestores.length === 0 ? (
            <Card className="text-center py-12">
              <Star className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500">Ainda não há gestores com avaliações suficientes</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {gestores.length >= 3 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="md:order-1 md:mt-8">
                    <Link href={`/gestores/${gestores[1].id}`}>
                      <Card variant="hover" className="text-center bg-neutral-50 dark:bg-neutral-700">
                        <div className="relative inline-block">
                          <Avatar src={gestores[1].foto} alt={gestores[1].user?.nome} size="lg" />
                          <span className="absolute -top-2 -right-2 w-8 h-8 bg-neutral-300 border-2 border-neutral-900 rounded-full flex items-center justify-center font-bold text-lg">2</span>
                        </div>
                        <h3 className="font-bold text-lg mt-3 dark:text-neutral-100">{gestores[1].user?.nome}</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-300">{gestores[1].cargo}</p>
                        <div className="mt-3"><SimpleRating value={gestores[1].mediaAvaliacao} /></div>
                      </Card>
                    </Link>
                  </div>
                  <div className="md:order-2">
                    <Link href={`/gestores/${gestores[0].id}`}>
                      <Card variant="hover" className="text-center bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400">
                        <div className="relative inline-block">
                          <Avatar src={gestores[0].foto} alt={gestores[0].user?.nome} size="xl" />
                          <span className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-400 border-2 border-neutral-900 rounded-full flex items-center justify-center font-bold text-xl">1</span>
                        </div>
                        <Trophy className="w-8 h-8 text-yellow-500 mx-auto mt-2" />
                        <h3 className="font-bold text-xl mt-2 dark:text-neutral-100">{gestores[0].user?.nome}</h3>
                        <p className="text-neutral-600 dark:text-neutral-300">{gestores[0].cargo}</p>
                        <div className="mt-3"><SimpleRating value={gestores[0].mediaAvaliacao} size="lg" /></div>
                        {gestores[0].badges?.length > 0 && (
                          <div className="flex justify-center gap-2 mt-3">
                            {gestores[0].badges.slice(0, 2).map((badge: any) => (
                              <BadgeIcon key={badge.id} type={badge.tipo} showLabel={false} />
                            ))}
                          </div>
                        )}
                      </Card>
                    </Link>
                  </div>
                  <div className="md:order-3 md:mt-8">
                    <Link href={`/gestores/${gestores[2].id}`}>
                      <Card variant="hover" className="text-center bg-amber-50 dark:bg-amber-900/20">
                        <div className="relative inline-block">
                          <Avatar src={gestores[2].foto} alt={gestores[2].user?.nome} size="lg" />
                          <span className="absolute -top-2 -right-2 w-8 h-8 bg-amber-600 border-2 border-neutral-900 rounded-full flex items-center justify-center font-bold text-lg text-white">3</span>
                        </div>
                        <h3 className="font-bold text-lg mt-3 dark:text-neutral-100">{gestores[2].user?.nome}</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-300">{gestores[2].cargo}</p>
                        <div className="mt-3"><SimpleRating value={gestores[2].mediaAvaliacao} /></div>
                      </Card>
                    </Link>
                  </div>
                </div>
              )}
              <Card>
                <CardTitle className="mb-4">Classificação Completa</CardTitle>
                <CardContent>
                  <div className="space-y-3">
                    {gestores.map((gestor, index) => (
                      <Link
                        key={gestor.id}
                        href={`/gestores/${gestor.id}`}
                        className="flex items-center gap-4 p-4 border-2 border-neutral-200 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all"
                      >
                        <span className={`w-10 h-10 border-2 border-neutral-900 flex items-center justify-center font-bold ${getMedalColor(index)}`}>
                          {index + 1}
                        </span>
                        <Avatar src={gestor.foto} alt={gestor.user?.nome} size="md" />
                        <div className="flex-1">
                          <p className="font-bold text-neutral-900 dark:text-neutral-100">{gestor.user?.nome}</p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-300">{gestor.cargo}</p>
                        </div>
                        <div className="text-right">
                          <SimpleRating value={gestor.mediaAvaliacao} />
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{gestor.totalAvaliacoes} avaliações</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        ) : (
          /* ---- RANKING COLABORADORES ---- */
          colaboradores.length === 0 ? (
            <Card className="text-center py-12">
              <Star className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500">Ainda não há colaboradores com feedbacks</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {colaboradores.length >= 3 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="md:order-1 md:mt-8">
                    <Card className="text-center bg-neutral-50">
                      <div className="relative inline-flex justify-center">
                        <ColaboradorInitial nome={colaboradores[1].nome} size="lg" />
                        <span className="absolute -top-2 -right-2 w-8 h-8 bg-neutral-300 border-2 border-neutral-900 rounded-full flex items-center justify-center font-bold text-lg">2</span>
                      </div>
                      <h3 className="font-bold text-lg mt-3 dark:text-neutral-100">{colaboradores[1].nome}</h3>
                      <div className="mt-3"><SimpleRating value={colaboradores[1].mediaFeedback} /></div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{colaboradores[1].totalFeedbacks} feedbacks</p>
                    </Card>
                  </div>
                  <div className="md:order-2">
                    <Card className="text-center bg-yellow-50 border-yellow-400">
                      <div className="relative inline-flex justify-center">
                        <ColaboradorInitial nome={colaboradores[0].nome} size="xl" />
                        <span className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-400 border-2 border-neutral-900 rounded-full flex items-center justify-center font-bold text-xl">1</span>
                      </div>
                      <Trophy className="w-8 h-8 text-yellow-500 mx-auto mt-2" />
                      <h3 className="font-bold text-xl mt-2 dark:text-neutral-100">{colaboradores[0].nome}</h3>
                      <div className="mt-3"><SimpleRating value={colaboradores[0].mediaFeedback} size="lg" /></div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{colaboradores[0].totalFeedbacks} feedbacks</p>
                    </Card>
                  </div>
                  <div className="md:order-3 md:mt-8">
                    <Card className="text-center bg-amber-50">
                      <div className="relative inline-flex justify-center">
                        <ColaboradorInitial nome={colaboradores[2].nome} size="lg" />
                        <span className="absolute -top-2 -right-2 w-8 h-8 bg-amber-600 border-2 border-neutral-900 rounded-full flex items-center justify-center font-bold text-lg text-white">3</span>
                      </div>
                      <h3 className="font-bold text-lg mt-3 dark:text-neutral-100">{colaboradores[2].nome}</h3>
                      <div className="mt-3"><SimpleRating value={colaboradores[2].mediaFeedback} /></div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{colaboradores[2].totalFeedbacks} feedbacks</p>
                    </Card>
                  </div>
                </div>
              )}
              <Card>
                <CardTitle className="mb-4">Classificação Completa</CardTitle>
                <CardContent>
                  <div className="space-y-3">
                    {colaboradores.map((col, index) => (
                      <div
                        key={col.slackId}
                        className="flex items-center gap-4 p-4 border-2 border-neutral-200 dark:border-neutral-700"
                      >
                        <span className={`w-10 h-10 border-2 border-neutral-900 flex items-center justify-center font-bold ${getMedalColor(index)}`}>
                          {index + 1}
                        </span>
                        <ColaboradorInitial nome={col.nome} size="md" />
                        <div className="flex-1">
                          <p className="font-bold text-neutral-900 dark:text-neutral-100">{col.nome}</p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Colaborador</p>
                        </div>
                        <div className="text-right">
                          <SimpleRating value={col.mediaFeedback} />
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{col.totalFeedbacks} feedbacks</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        )}
      </div>
    </SmartLayout>
  );
}
