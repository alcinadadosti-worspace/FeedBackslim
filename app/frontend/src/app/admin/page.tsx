'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Star,
  AlertTriangle,
  TrendingUp,
  Download,
  ArrowRight,
  BarChart3,
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
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

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
      const response = await dashboardAPI.export(tipo, 'csv');
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tipo}_export.csv`;
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-neutral-900">Painel Administrativo</h1>
            <p className="text-neutral-600 mt-1">
              Visão geral de avaliações e denúncias
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Select
              options={periodoOptions}
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-48"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loading size="lg" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <Card className="bg-blue-50">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-neutral-900">{data?.stats?.totalUsers || 0}</p>
                    <p className="text-sm text-neutral-600">Usuários</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-primary-50">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-primary-600" />
                  <div>
                    <p className="text-2xl font-bold text-neutral-900">{data?.stats?.totalGestores || 0}</p>
                    <p className="text-sm text-neutral-600">Gestores</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-gold-50">
                <div className="flex items-center gap-3">
                  <Star className="w-8 h-8 text-gold-600" />
                  <div>
                    <p className="text-2xl font-bold text-neutral-900">{data?.stats?.totalAvaliacoes || 0}</p>
                    <p className="text-sm text-neutral-600">Avaliações</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-red-50">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-neutral-900">{data?.stats?.totalDenuncias || 0}</p>
                    <p className="text-sm text-neutral-600">Denúncias</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-orange-50">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold text-neutral-900">{data?.stats?.denunciasPendentes || 0}</p>
                    <p className="text-sm text-neutral-600">Pendentes</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Top Gestores */}
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <CardTitle>Top Gestores</CardTitle>
                  <Link href="/ranking">
                    <Button variant="outline" size="sm">
                      Ver Todos <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
                <CardContent>
                  <div className="space-y-3">
                    {data?.topGestores?.slice(0, 5).map((gestor: any, index: number) => (
                      <div
                        key={gestor.id}
                        className="flex items-center gap-3 p-3 border-2 border-neutral-200"
                      >
                        <span className="w-8 h-8 bg-gold-400 border-2 border-neutral-900 flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                        <Avatar src={gestor.foto} alt={gestor.user?.nome} size="sm" />
                        <div className="flex-1">
                          <p className="font-semibold">{gestor.user?.nome}</p>
                          <p className="text-xs text-neutral-500">{gestor.cargo}</p>
                        </div>
                        <SimpleRating value={gestor.mediaAvaliacao} size="sm" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Denúncias por Tipo */}
              <Card>
                <CardTitle className="mb-6">Denúncias por Tipo</CardTitle>
                <CardContent>
                  {denunciasPorTipoData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={denunciasPorTipoData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {denunciasPorTipoData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-neutral-500 py-8">
                      Nenhuma denúncia registrada
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Gestores com mais denúncias */}
            {data?.gestoresDenunciados?.length > 0 && (
              <Card className="mb-8 bg-red-50">
                <CardTitle className="flex items-center gap-2 mb-6">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  Gestores com Denúncias
                </CardTitle>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.gestoresDenunciados.map((item: any) => (
                      <div key={item.gestor?.id} className="p-4 bg-white border-2 border-neutral-900">
                        <div className="flex items-center gap-3">
                          <Avatar src={item.gestor?.foto} alt={item.gestor?.user?.nome} size="md" />
                          <div className="flex-1">
                            <p className="font-bold">{item.gestor?.user?.nome}</p>
                            <p className="text-sm text-neutral-600">{item.gestor?.cargo}</p>
                          </div>
                          <Badge variant="danger">{item.totalDenuncias}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Avaliações Recentes */}
              <Card>
                <CardTitle className="mb-6">Avaliações Recentes</CardTitle>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {data?.avaliacoesRecentes?.map((avaliacao: any) => (
                      <div key={avaliacao.id} className="p-3 border-2 border-neutral-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-sm">{avaliacao.gestor?.user?.nome}</p>
                          <SimpleRating value={avaliacao.nota} size="sm" />
                        </div>
                        <p className="text-xs text-neutral-500">
                          Por {avaliacao.autor?.nome} em{' '}
                          {format(new Date(avaliacao.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Denúncias Recentes */}
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <CardTitle>Denúncias Recentes</CardTitle>
                  <Link href="/admin/denuncias">
                    <Button variant="danger" size="sm">
                      Ver Todas <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {data?.denunciasRecentes?.map((denuncia: any) => (
                      <div key={denuncia.id} className="p-3 border-2 border-red-200 bg-red-50">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-sm">{denuncia.gestor?.user?.nome}</p>
                          <Badge variant="danger">{denuncia.tipo.replace(/_/g, ' ')}</Badge>
                        </div>
                        <p className="text-xs text-neutral-600 line-clamp-2">{denuncia.descricao}</p>
                        <p className="text-xs text-neutral-400 mt-1">
                          {format(new Date(denuncia.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    ))}

                    {(!data?.denunciasRecentes || data.denunciasRecentes.length === 0) && (
                      <p className="text-center text-neutral-500 py-4">
                        Nenhuma denúncia recente
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Export Buttons */}
            <Card>
              <CardTitle className="mb-6">Exportar Dados</CardTitle>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button variant="outline" onClick={() => handleExport('avaliacoes')}>
                    <Download className="w-5 h-5" />
                    Exportar Avaliações
                  </Button>
                  <Button variant="outline" onClick={() => handleExport('denuncias')}>
                    <Download className="w-5 h-5" />
                    Exportar Denúncias
                  </Button>
                  <Button variant="outline" onClick={() => handleExport('gestores')}>
                    <Download className="w-5 h-5" />
                    Exportar Gestores
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
