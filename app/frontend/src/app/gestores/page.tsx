'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { SmartLayout } from '@/components/layout/SmartLayout';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, BadgeIcon } from '@/components/ui/Badge';
import { SimpleRating } from '@/components/ui/Rating';
import { Loading } from '@/components/ui/Loading';
import { gestoresAPI } from '@/lib/api';

export default function GestoresPage() {
  const [gestores, setGestores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departamento, setDepartamento] = useState('');

  useEffect(() => {
    loadGestores();
  }, []);

  const loadGestores = async () => {
    try {
      const response = await gestoresAPI.list();
      setGestores(response.data);
    } catch (error) {
      console.error('Erro ao carregar gestores:', error);
    } finally {
      setLoading(false);
    }
  };

  const departamentos = [...new Set(gestores.map((g) => g.departamento).filter(Boolean))].sort();

  const filteredGestores = gestores.filter((gestor) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      gestor.user?.nome?.toLowerCase().includes(searchLower) ||
      gestor.cargo?.toLowerCase().includes(searchLower) ||
      gestor.departamento?.toLowerCase().includes(searchLower);
    const matchesDept = !departamento || gestor.departamento === departamento;
    return matchesSearch && matchesDept;
  });

  return (
    <SmartLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-neutral-900">Gestores</h1>
            <p className="text-neutral-600 mt-1">
              Conheça os gestores e veja suas avaliações
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <Input
                placeholder="Buscar gestor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            </div>
            {departamentos.length > 0 && (
              <div className="w-full sm:w-48">
                <Select
                  options={[
                    { value: '', label: 'Todos departamentos' },
                    ...departamentos.map((d) => ({ value: d, label: d })),
                  ]}
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loading size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGestores.map((gestor) => (
              <Link key={gestor.id} href={`/gestores/${gestor.id}`}>
                <Card variant="hover" className="h-full">
                  <div className="flex items-start gap-4">
                    <Avatar src={gestor.foto} alt={gestor.user?.nome} size="lg" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-neutral-900 truncate">
                        {gestor.user?.nome}
                      </h3>
                      <p className="text-neutral-600 text-sm">{gestor.cargo}</p>
                      {gestor.departamento && (
                        <Badge variant="neutral" className="mt-2">
                          {gestor.departamento}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t-2 border-neutral-200">
                    <div className="flex items-center justify-between">
                      <SimpleRating value={gestor.mediaAvaliacao} />
                      <span className="text-sm text-neutral-500">
                        {gestor.totalAvaliacoes} avaliações
                      </span>
                    </div>
                  </div>

                  {gestor.badges && gestor.badges.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {gestor.badges.slice(0, 3).map((badge: any) => (
                        <BadgeIcon key={badge.id} type={badge.tipo} showLabel={false} size="sm" />
                      ))}
                    </div>
                  )}
                </Card>
              </Link>
            ))}

            {filteredGestores.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-neutral-500">Nenhum gestor encontrado</p>
              </div>
            )}
          </div>
        )}
      </div>
    </SmartLayout>
  );
}
