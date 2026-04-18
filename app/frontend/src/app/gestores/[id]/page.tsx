'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Star, MessageSquare, ThumbsUp, Lightbulb, AlertCircle } from 'lucide-react';
import { SmartLayout } from '@/components/layout/SmartLayout';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, BadgeIcon } from '@/components/ui/Badge';
import { SimpleRating } from '@/components/ui/Rating';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { gestoresAPI } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GestorPerfilPage() {
  const params = useParams();
  const [gestor, setGestor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) loadGestor(params.id as string);
  }, [params.id]);

  const loadGestor = async (id: string) => {
    try {
      const response = await gestoresAPI.getById(id);
      setGestor(response.data);
    } catch (error) {
      console.error('Erro ao carregar gestor:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SmartLayout>
        <div className="flex justify-center py-12"><Loading size="lg" /></div>
      </SmartLayout>
    );
  }

  if (!gestor) {
    return (
      <SmartLayout>
        <div className="text-center py-12"><p className="text-neutral-500">Gestor não encontrado</p></div>
      </SmartLayout>
    );
  }

  const elogios = gestor.avaliacoes?.filter((a: any) => a.elogio) || [];
  const sugestoes = gestor.avaliacoes?.filter((a: any) => a.sugestao) || [];
  const criticas = gestor.avaliacoes?.filter((a: any) => a.critica) || [];

  return (
    <SmartLayout>
      <div className="max-w-5xl mx-auto">
        {/* Profile Header */}
        <Card className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div className="flex items-start gap-4 sm:flex-col sm:items-center">
              <Avatar src={gestor.foto} alt={gestor.user?.nome} size="lg" className="sm:hidden" />
              <Avatar src={gestor.foto} alt={gestor.user?.nome} size="xl" className="hidden sm:block" />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-3xl font-display font-bold text-neutral-900 dark:text-neutral-100">
                {gestor.user?.nome}
              </h1>
              <p className="text-base sm:text-xl text-neutral-600 dark:text-neutral-300 mt-1">{gestor.cargo}</p>

              {gestor.departamento && (
                <Badge variant="primary" className="mt-2 sm:mt-3">
                  {gestor.departamento}
                </Badge>
              )}

              {gestor.bio && (
                <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 mt-3 sm:mt-4">{gestor.bio}</p>
              )}

              {gestor.badges && gestor.badges.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
                  {gestor.badges.map((badge: any) => (
                    <BadgeIcon key={badge.id} type={badge.tipo} />
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-3 p-4 sm:p-6 bg-neutral-50 dark:bg-neutral-700 border-3 border-neutral-900 dark:border-neutral-100">
              <div className="text-center">
                <p className="text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-300 uppercase mb-1 sm:mb-2">Média Geral</p>
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <Star className="w-6 h-6 sm:w-8 sm:h-8 text-gold-400 fill-gold-400" />
                  <span className="text-2xl sm:text-4xl font-bold text-neutral-900 dark:text-neutral-100">
                    {gestor.mediaAvaliacao.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {gestor.totalAvaliacoes} avaliações
                </p>
              </div>

              <Link href={`/avaliar?gestor=${gestor.id}`} className="mt-0 sm:mt-4">
                <Button variant="primary" size="sm">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5" />
                  Avaliar
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Feedback Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-green-50 dark:bg-green-900/20 p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <ThumbsUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 shrink-0" />
              <div>
                <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{elogios.length}</p>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">Elogios</p>
              </div>
            </div>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <Lightbulb className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 shrink-0" />
              <div>
                <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{sugestoes.length}</p>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">Sugestões</p>
              </div>
            </div>
          </Card>

          <Card className="bg-orange-50 dark:bg-orange-900/20 p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 shrink-0" />
              <div>
                <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{criticas.length}</p>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">Críticas</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Avaliações */}
        <Card>
          <CardTitle className="flex items-center gap-2 mb-4 sm:mb-6 text-base sm:text-lg">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            Histórico de Avaliações
          </CardTitle>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {gestor.avaliacoes?.map((avaliacao: any) => (
                <div key={avaliacao.id} className="p-3 sm:p-4 border-2 border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-start sm:items-center justify-between mb-2 sm:mb-3 gap-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Avatar src={null} alt={avaliacao.autor?.nome} size="sm" />
                      <div>
                        <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                          {avaliacao.autor?.nome || 'Colaborador'}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {format(new Date(avaliacao.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <SimpleRating value={avaliacao.nota} size="sm" />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    {avaliacao.elogio && (
                      <div className="flex items-start gap-2">
                        <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                          <span className="font-semibold text-green-700 dark:text-green-400">Elogio:</span> {avaliacao.elogio}
                        </p>
                      </div>
                    )}
                    {avaliacao.sugestao && (
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                          <span className="font-semibold text-blue-700 dark:text-blue-400">Sugestão:</span> {avaliacao.sugestao}
                        </p>
                      </div>
                    )}
                    {avaliacao.critica && (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                          <span className="font-semibold text-orange-700 dark:text-orange-400">Crítica:</span> {avaliacao.critica}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {(!gestor.avaliacoes || gestor.avaliacoes.length === 0) && (
                <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 py-8">
                  Este gestor ainda não recebeu avaliações
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </SmartLayout>
  );
}
