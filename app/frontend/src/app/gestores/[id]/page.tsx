'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Star, MessageSquare, ThumbsUp, Lightbulb, AlertCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, BadgeIcon } from '@/components/ui/Badge';
import { SimpleRating } from '@/components/ui/Rating';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { useAuthStore } from '@/store/auth';
import { gestoresAPI } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GestorPerfilPage() {
  const params = useParams();
  const { user } = useAuthStore();
  const [gestor, setGestor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadGestor(params.id as string);
    }
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
      <MainLayout>
        <div className="flex justify-center py-12">
          <Loading size="lg" />
        </div>
      </MainLayout>
    );
  }

  if (!gestor) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-neutral-500">Gestor não encontrado</p>
        </div>
      </MainLayout>
    );
  }

  const elogios = gestor.avaliacoes?.filter((a: any) => a.elogio) || [];
  const sugestoes = gestor.avaliacoes?.filter((a: any) => a.sugestao) || [];
  const criticas = gestor.avaliacoes?.filter((a: any) => a.critica) || [];

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <Link href="/gestores" className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6">
          <ArrowLeft className="w-5 h-5" />
          Voltar para lista
        </Link>

        {/* Profile Header */}
        <Card className="mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar src={gestor.foto} alt={gestor.user?.nome} size="xl" />

            <div className="flex-1">
              <h1 className="text-3xl font-display font-bold text-neutral-900">
                {gestor.user?.nome}
              </h1>
              <p className="text-xl text-neutral-600 mt-1">{gestor.cargo}</p>

              {gestor.departamento && (
                <Badge variant="primary" className="mt-3">
                  {gestor.departamento}
                </Badge>
              )}

              {gestor.bio && (
                <p className="text-neutral-600 mt-4">{gestor.bio}</p>
              )}

              {/* Badges */}
              {gestor.badges && gestor.badges.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {gestor.badges.map((badge: any) => (
                    <BadgeIcon key={badge.id} type={badge.tipo} />
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-col items-center justify-center p-6 bg-neutral-50 border-3 border-neutral-900">
              <div className="text-center">
                <p className="text-sm font-bold text-neutral-600 uppercase mb-2">Média Geral</p>
                <div className="flex items-center justify-center gap-2">
                  <Star className="w-8 h-8 text-gold-400 fill-gold-400" />
                  <span className="text-4xl font-bold text-neutral-900">
                    {gestor.mediaAvaliacao.toFixed(1)}
                  </span>
                </div>
                <p className="text-sm text-neutral-500 mt-2">
                  {gestor.totalAvaliacoes} avaliações
                </p>
              </div>

              {user?.role === 'COLABORADOR' && (
                <Link href={`/avaliar?gestor=${gestor.id}`} className="mt-4">
                  <Button variant="primary">
                    <Star className="w-5 h-5" />
                    Avaliar
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </Card>

        {/* Feedback Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-green-50">
            <div className="flex items-center gap-3">
              <ThumbsUp className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-neutral-900">{elogios.length}</p>
                <p className="text-sm text-neutral-600">Elogios</p>
              </div>
            </div>
          </Card>

          <Card className="bg-blue-50">
            <div className="flex items-center gap-3">
              <Lightbulb className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-neutral-900">{sugestoes.length}</p>
                <p className="text-sm text-neutral-600">Sugestões</p>
              </div>
            </div>
          </Card>

          <Card className="bg-orange-50">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-neutral-900">{criticas.length}</p>
                <p className="text-sm text-neutral-600">Críticas Construtivas</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Avaliações */}
        <Card>
          <CardTitle className="flex items-center gap-2 mb-6">
            <MessageSquare className="w-6 h-6" />
            Histórico de Avaliações
          </CardTitle>
          <CardContent>
            <div className="space-y-4">
              {gestor.avaliacoes?.map((avaliacao: any) => (
                <div
                  key={avaliacao.id}
                  className="p-4 border-2 border-neutral-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={null} alt={avaliacao.autor?.nome} size="sm" />
                      <div>
                        <p className="font-semibold text-neutral-900">
                          {avaliacao.autor?.nome || 'Colaborador'}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {format(new Date(avaliacao.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <SimpleRating value={avaliacao.nota} />
                  </div>

                  <div className="space-y-2">
                    {avaliacao.elogio && (
                      <div className="flex items-start gap-2">
                        <ThumbsUp className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                        <p className="text-neutral-700">
                          <span className="font-semibold text-green-700">Elogio:</span> {avaliacao.elogio}
                        </p>
                      </div>
                    )}
                    {avaliacao.sugestao && (
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                        <p className="text-neutral-700">
                          <span className="font-semibold text-blue-700">Sugestão:</span> {avaliacao.sugestao}
                        </p>
                      </div>
                    )}
                    {avaliacao.critica && (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-600 mt-1 flex-shrink-0" />
                        <p className="text-neutral-700">
                          <span className="font-semibold text-orange-700">Crítica:</span> {avaliacao.critica}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {(!gestor.avaliacoes || gestor.avaliacoes.length === 0) && (
                <p className="text-center text-neutral-500 py-8">
                  Este gestor ainda não recebeu avaliações
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
