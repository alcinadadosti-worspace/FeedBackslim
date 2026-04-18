'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, Star, AlertTriangle, Download, ArrowRight,
  BarChart3, MessageSquare, Clock,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { SimpleRating } from '@/components/ui/Rating';
import { Loading } from '@/components/ui/Loading';
import { dashboardAPI } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#98d4a0', '#d4b896', '#f87171', '#60a5fa'];

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('30');

  useEffect(() => {
    loadDashboard();
  }, [periodo]);

  const loadDashboard = async () => {
    try {
      const response = await dashboardAPI.admin(Number(periodo));
      setData(response.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (tipo: string) => {
    try {
      const response = await dashboardAPI.export(tipo, 'xlsx');
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tipo}_export.xlsx`;
      a.click();
    } catch (error) {
      console.error('Erro ao exportar:', error);
    }
  };

  const periodoOptions = [
    { value: '7', label: 'Últimos 7 dias' },
    { value: '30', label: 'Últimos 30 dias' },
    { value: '90', label: 'Últimos 90 dias' },
    { value: '365', label: 'Último ano' },
  ];

  const denunciasPorTipoData = data?.denunciasPorTipo
    ? Object.entries(data.denunciasPorTipo).map(([tipo, count]) => ({
        name: tipo.replace(/_/g, ' '),
        value: count,
      }))
    : [];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-neutral-900 dark:text-neutral-100">Painel Administrativo</h1>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 mt-1">
              Visão geral de avaliações e denúncias
            </p>
          </div>
          <div className="w-full sm:w-48">
            <Select options={periodoOptions} value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loading size="lg" /></div>
        ) : (
          <>
            {/* Stats Cards — 2 cols on mobile, 4 on md, 7 on lg */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <Card className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-6">
                <div className="flex flex-col gap-1">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{data?.stats?.totalUsers || 0}</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">Usuários</p>
                </div>
              </Card>
              <Card className="bg-primary-50 dark:bg-primary-900/30 p-3 sm:p-6">
                <div className="flex flex-col gap-1">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
                  <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{data?.stats?.totalGestores || 0}</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">Gestores</p>
                </div>
              </Card>
              <Card className="bg-gold-50 dark:bg-gold-900/20 p-3 sm:p-6">
                <div className="flex flex-col gap-1">
                  <Star className="w-5 h-5 sm:w-6 sm:h-6 text-gold-600" />
                  <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{data?.stats?.totalAvaliacoes || 0}</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">Avaliações</p>
                </div>
              </Card>
              <Card className="bg-yellow-50 dark:bg-yellow-900/20 p-3 sm:p-6">
                <div className="flex flex-col gap-1">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                  <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{data?.stats?.mediaGeralAvaliacoes ?? '—'}</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">Média Geral</p>
                </div>
              </Card>
              <Card className="bg-purple-50 dark:bg-purple-900/20 p-3 sm:p-6">
                <div className="flex flex-col gap-1">
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{data?.stats?.totalFeedbacksColaboradores || 0}</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">Feedbacks Col.</p>
                </div>
              </Card>
              <Card className="bg-red-50 dark:bg-red-900/20 p-3 sm:p-6">
                <div className="flex flex-col gap-1">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                  <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{data?.stats?.totalDenuncias || 0}</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">Denúncias</p>
                </div>
              </Card>
              <Card className="bg-orange-50 dark:bg-orange-900/20 p-3 sm:p-6">
                <div className="flex flex-col gap-1">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{data?.stats?.denunciasPendentes || 0}</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">Pendentes</p>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
              {/* Top Gestores */}
              <Card>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <CardTitle className="text-base sm:text-lg">Top Gestores</CardTitle>
                  <Link href="/ranking">
                    <Button variant="outline" size="sm">Ver Todos <ArrowRight className="w-4 h-4" /></Button>
                  </Link>
                </div>
                <CardContent>
                  <div className="space-y-2 sm:space-y-3">
                    {data?.topGestores?.slice(0, 5).map((gestor: any, index: number) => (
                      <div key={gestor.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border-2 border-neutral-200 dark:border-neutral-700">
                        <span className="w-7 h-7 sm:w-8 sm:h-8 bg-gold-400 border-2 border-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                          {index + 1}
                        </span>
                        <Avatar src={gestor.foto} alt={gestor.user?.nome} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm dark:text-neutral-100 truncate">{gestor.user?.nome}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{gestor.cargo}</p>
                        </div>
                        <SimpleRating value={gestor.mediaAvaliacao} size="sm" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Denúncias por Tipo */}
              <Card>
                <CardTitle className="mb-4 sm:mb-6 text-base sm:text-lg">Denúncias por Tipo</CardTitle>
                <CardContent>
                  {denunciasPorTipoData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={denunciasPorTipoData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                          {denunciasPorTipoData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 py-8">Nenhuma denúncia registrada</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Gestores com mais denúncias */}
            {data?.gestoresDenunciados?.length > 0 && (
              <Card className="mb-6 sm:mb-8 bg-red-50 dark:bg-red-900/20">
                <CardTitle className="flex items-center gap-2 mb-4 sm:mb-6 text-base sm:text-lg">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                  Gestores com Denúncias
                </CardTitle>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {data.gestoresDenunciados.map((item: any) => (
                      <div key={item.gestor?.id} className="p-3 sm:p-4 bg-white dark:bg-neutral-700 border-2 border-neutral-900 dark:border-neutral-500">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Avatar src={item.gestor?.foto} alt={item.gestor?.user?.nome} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm dark:text-neutral-100 truncate">{item.gestor?.user?.nome}</p>
                            <p className="text-xs text-neutral-600 dark:text-neutral-300 truncate">{item.gestor?.cargo}</p>
                          </div>
                          <Badge variant="danger">{item.totalDenuncias}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
              {/* Avaliações Recentes */}
              <Card>
                <CardTitle className="mb-4 sm:mb-6 text-base sm:text-lg">Avaliações Recentes</CardTitle>
                <CardContent>
                  <div className="space-y-2 sm:space-y-3 max-h-80 overflow-y-auto">
                    {data?.avaliacoesRecentes?.map((avaliacao: any) => (
                      <div key={avaliacao.id} className="p-2.5 sm:p-3 border-2 border-neutral-200 dark:border-neutral-700">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-semibold text-xs sm:text-sm dark:text-neutral-100 truncate">{avaliacao.gestor?.user?.nome}</p>
                          <SimpleRating value={avaliacao.nota} size="sm" />
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Anônimo · {format(new Date(avaliacao.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Denúncias Recentes */}
              <Card>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <CardTitle className="text-base sm:text-lg">Denúncias Recentes</CardTitle>
                  <Link href="/admin/denuncias">
                    <Button variant="danger" size="sm">Ver Todas <ArrowRight className="w-4 h-4" /></Button>
                  </Link>
                </div>
                <CardContent>
                  <div className="space-y-2 sm:space-y-3 max-h-80 overflow-y-auto">
                    {data?.denunciasRecentes?.map((denuncia: any) => (
                      <div key={denuncia.id} className="p-2.5 sm:p-3 border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-semibold text-xs sm:text-sm dark:text-neutral-100 truncate">{denuncia.gestor?.user?.nome}</p>
                          <Badge variant="danger" className="shrink-0 text-xs">{denuncia.tipo.replace(/_/g, ' ')}</Badge>
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2">{denuncia.descricao}</p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                          {format(new Date(denuncia.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    ))}
                    {(!data?.denunciasRecentes || data.denunciasRecentes.length === 0) && (
                      <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 py-4">Nenhuma denúncia recente</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Export Buttons */}
            <Card>
              <CardTitle className="mb-4 sm:mb-6 text-base sm:text-lg">Exportar Dados</CardTitle>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" size="sm" onClick={() => handleExport('avaliacoes')}>
                    <Download className="w-4 h-4" />
                    Avaliações
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExport('denuncias')}>
                    <Download className="w-4 h-4" />
                    Denúncias
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExport('gestores')}>
                    <Download className="w-4 h-4" />
                    Gestores
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
