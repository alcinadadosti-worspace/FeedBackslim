'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Medal, Star } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { BadgeIcon } from '@/components/ui/Badge';
import { SimpleRating } from '@/components/ui/Rating';
import { Loading } from '@/components/ui/Loading';
import { gestoresAPI } from '@/lib/api';

export default function RankingPage() {
  const [gestores, setGestores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    try {
      const response = await gestoresAPI.ranking();
      setGestores(response.data);
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalColor = (position: number) => {
    switch (position) {
      case 0:
        return 'bg-yellow-400 text-yellow-900';
      case 1:
        return 'bg-neutral-300 text-neutral-700';
      case 2:
        return 'bg-amber-600 text-amber-100';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gold-400 border-3 border-neutral-900 shadow-brutal mb-4">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-display font-bold text-neutral-900">Ranking de Gestores</h1>
          <p className="text-neutral-600 mt-2">
            Os gestores mais bem avaliados da empresa
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loading size="lg" />
          </div>
        ) : gestores.length === 0 ? (
          <Card className="text-center py-12">
            <Star className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">Ainda não há gestores com avaliações suficientes</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Top 3 */}
            {gestores.length >= 3 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* 2nd place */}
                <div className="md:order-1 md:mt-8">
                  <Link href={`/gestores/${gestores[1].id}`}>
                    <Card variant="hover" className="text-center bg-neutral-50">
                      <div className="relative inline-block">
                        <Avatar src={gestores[1].foto} alt={gestores[1].user?.nome} size="lg" />
                        <span className="absolute -top-2 -right-2 w-8 h-8 bg-neutral-300 border-2 border-neutral-900 rounded-full flex items-center justify-center font-bold text-lg">
                          2
                        </span>
                      </div>
                      <h3 className="font-bold text-lg mt-3">{gestores[1].user?.nome}</h3>
                      <p className="text-sm text-neutral-600">{gestores[1].cargo}</p>
                      <div className="mt-3">
                        <SimpleRating value={gestores[1].mediaAvaliacao} />
                      </div>
                    </Card>
                  </Link>
                </div>

                {/* 1st place */}
                <div className="md:order-2">
                  <Link href={`/gestores/${gestores[0].id}`}>
                    <Card variant="hover" className="text-center bg-yellow-50 border-yellow-400">
                      <div className="relative inline-block">
                        <Avatar src={gestores[0].foto} alt={gestores[0].user?.nome} size="xl" />
                        <span className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-400 border-2 border-neutral-900 rounded-full flex items-center justify-center font-bold text-xl">
                          1
                        </span>
                      </div>
                      <Trophy className="w-8 h-8 text-yellow-500 mx-auto mt-2" />
                      <h3 className="font-bold text-xl mt-2">{gestores[0].user?.nome}</h3>
                      <p className="text-neutral-600">{gestores[0].cargo}</p>
                      <div className="mt-3">
                        <SimpleRating value={gestores[0].mediaAvaliacao} size="lg" />
                      </div>
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

                {/* 3rd place */}
                <div className="md:order-3 md:mt-8">
                  <Link href={`/gestores/${gestores[2].id}`}>
                    <Card variant="hover" className="text-center bg-amber-50">
                      <div className="relative inline-block">
                        <Avatar src={gestores[2].foto} alt={gestores[2].user?.nome} size="lg" />
                        <span className="absolute -top-2 -right-2 w-8 h-8 bg-amber-600 border-2 border-neutral-900 rounded-full flex items-center justify-center font-bold text-lg text-white">
                          3
                        </span>
                      </div>
                      <h3 className="font-bold text-lg mt-3">{gestores[2].user?.nome}</h3>
                      <p className="text-sm text-neutral-600">{gestores[2].cargo}</p>
                      <div className="mt-3">
                        <SimpleRating value={gestores[2].mediaAvaliacao} />
                      </div>
                    </Card>
                  </Link>
                </div>
              </div>
            )}

            {/* Rest of ranking */}
            <Card>
              <CardTitle className="mb-4">Classificação Completa</CardTitle>
              <CardContent>
                <div className="space-y-3">
                  {gestores.map((gestor, index) => (
                    <Link
                      key={gestor.id}
                      href={`/gestores/${gestor.id}`}
                      className="flex items-center gap-4 p-4 border-2 border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 transition-all"
                    >
                      <span
                        className={`w-10 h-10 border-2 border-neutral-900 flex items-center justify-center font-bold ${getMedalColor(
                          index
                        )}`}
                      >
                        {index + 1}
                      </span>
                      <Avatar src={gestor.foto} alt={gestor.user?.nome} size="md" />
                      <div className="flex-1">
                        <p className="font-bold text-neutral-900">{gestor.user?.nome}</p>
                        <p className="text-sm text-neutral-600">{gestor.cargo}</p>
                      </div>
                      <div className="text-right">
                        <SimpleRating value={gestor.mediaAvaliacao} />
                        <p className="text-xs text-neutral-500 mt-1">
                          {gestor.totalAvaliacoes} avaliações
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
