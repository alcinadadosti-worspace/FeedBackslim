'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, AlertTriangle, Eye, EyeOff, ChevronDown, ChevronUp, User, Building2, Hash, MessageSquare } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Loading } from '@/components/ui/Loading';
import { denunciasAPI } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const tiposOptions = [
  { value: '', label: 'Todos os tipos' },
  { value: 'ASSEDIO_MORAL', label: 'Assédio Moral' },
  { value: 'COMPORTAMENTO_INADEQUADO', label: 'Comportamento Inadequado' },
  { value: 'ABUSO_AUTORIDADE', label: 'Abuso de Autoridade' },
  { value: 'OUTROS', label: 'Outros' },
];

const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'EM_ANALISE', label: 'Em Análise' },
  { value: 'RESOLVIDA', label: 'Resolvida' },
  { value: 'ARQUIVADA', label: 'Arquivada' },
];

const statusColors: Record<string, string> = {
  PENDENTE: 'bg-yellow-400',
  EM_ANALISE: 'bg-blue-400',
  RESOLVIDA: 'bg-green-400',
  ARQUIVADA: 'bg-neutral-400',
};

export default function AdminDenunciasPage() {
  const searchParams = useSearchParams();
  const [denuncias, setDenuncias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState('');
  const [status, setStatus] = useState('');
  const [selectedDenuncia, setSelectedDenuncia] = useState<any>(null);
  const [comentarioRH, setComentarioRH] = useState('');

  useEffect(() => {
    loadDenuncias();
  }, [tipo, status]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) return;
    if (!denuncias.length) return;
    const found = denuncias.find((d) => d.id === id);
    if (!found) return;
    setSelectedDenuncia(found);
    setTimeout(() => {
      const el = document.getElementById(`denuncia-${id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [searchParams, denuncias]);

  const loadDenuncias = async () => {
    try {
      const params: any = {};
      if (tipo) params.tipo = tipo;
      if (status) params.status = status;

      const response = await denunciasAPI.list(params);
      setDenuncias(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar denúncias:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (denunciaId: string, newStatus: string) => {
    try {
      await denunciasAPI.updateStatus(denunciaId, newStatus, comentarioRH || undefined);
      toast.success('Status atualizado com sucesso!');
      setDenuncias((prev) =>
        prev.map((d) =>
          d.id === denunciaId
            ? { ...d, status: newStatus, ...(comentarioRH ? { comentarioRH } : {}) }
            : d
        )
      );
      setComentarioRH('');
      setSelectedDenuncia(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar status');
    }
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <Link href="/admin" className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6">
          <ArrowLeft className="w-5 h-5" />
          Voltar ao painel
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-neutral-900">Denúncias</h1>
            <p className="text-neutral-600 mt-1">
              Gerencie todas as denúncias da ouvidoria
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select
                label="Tipo"
                options={tiposOptions}
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Select
                label="Status"
                options={statusOptions}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loading size="lg" />
          </div>
        ) : (
          <div className="space-y-4">
            {denuncias.map((denuncia) => {
              const isOpen = selectedDenuncia?.id === denuncia.id;
              return (
              <Card
                key={denuncia.id}
                id={`denuncia-${denuncia.id}`}
                className={`transition-all ${isOpen ? 'ring-2 ring-primary-500' : ''}`}
              >
                {/* Header row - always visible */}
                <div
                  className="flex items-start gap-4 cursor-pointer"
                  onClick={() => {
                    setSelectedDenuncia(isOpen ? null : denuncia);
                    setComentarioRH(denuncia.comentarioRH || '');
                  }}
                >
                  <Avatar src={denuncia.gestor?.foto} alt={denuncia.gestor?.user?.nome} size="md" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-neutral-900">{denuncia.gestor?.user?.nome}</h3>
                      <Badge variant="danger">{denuncia.tipo.replace(/_/g, ' ')}</Badge>
                      <span className={`px-2 py-0.5 text-xs font-bold border-2 border-neutral-900 ${statusColors[denuncia.status]}`}>
                        {denuncia.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {denuncia.tipoManifestacao && (
                      <p className="text-xs text-neutral-500 mb-1">
                        Tipo: <span className="font-semibold">{denuncia.tipoManifestacao.replace(/_/g, ' ')}</span>
                      </p>
                    )}

                    <p className="text-sm text-neutral-600 line-clamp-2">{denuncia.descricao}</p>

                    <div className="flex items-center gap-4 text-xs text-neutral-400 mt-2">
                      <span className="flex items-center gap-1">
                        {denuncia.anonima ? (
                          <><EyeOff className="w-3 h-3" /> Anônima</>
                        ) : (
                          <><Eye className="w-3 h-3" /> Identificada</>
                        )}
                      </span>
                      <span>{format(new Date(denuncia.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                    </div>
                  </div>

                  <div className="shrink-0 text-neutral-400">
                    {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="mt-4 pt-4 border-t-2 border-neutral-200 space-y-4">

                    {/* Identificação do denunciante */}
                    {!denuncia.anonima && (
                      <div className="p-3 bg-blue-50 border-2 border-blue-200 space-y-1">
                        <p className="text-xs font-bold text-blue-800 uppercase mb-2">Identificação do Denunciante</p>
                        <div className="flex items-center gap-2 text-sm text-neutral-700">
                          <User className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>Nome: <strong>{denuncia.nomeIdentificado || '—'}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-neutral-700">
                          <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>Setor: <strong>{denuncia.setorIdentificado || '—'}</strong></span>
                        </div>
                      </div>
                    )}

                    {/* Temas */}
                    {denuncia.temas?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-neutral-500 uppercase mb-2">Temas abordados</p>
                        <div className="flex flex-wrap gap-2">
                          {denuncia.temas.map((tema: string) => (
                            <span key={tema} className="px-2 py-1 bg-neutral-100 border border-neutral-300 text-xs text-neutral-700">
                              {tema}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Descrição completa */}
                    <div>
                      <p className="text-xs font-bold text-neutral-500 uppercase mb-1">Descrição</p>
                      <p className="text-sm text-neutral-700 bg-neutral-50 border border-neutral-200 p-3">{denuncia.descricao}</p>
                    </div>

                    {denuncia.descricaoComplementar && (
                      <div>
                        <p className="text-xs font-bold text-neutral-500 uppercase mb-1">Descrição Complementar</p>
                        <p className="text-sm text-neutral-700 bg-neutral-50 border border-neutral-200 p-3">{denuncia.descricaoComplementar}</p>
                      </div>
                    )}

                    {/* Grid de detalhes */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {denuncia.frequencia && (
                        <div className="p-2 bg-neutral-50 border border-neutral-200">
                          <p className="text-xs text-neutral-400 mb-0.5">Frequência</p>
                          <p className="text-xs font-semibold text-neutral-700">{denuncia.frequencia.replace(/_/g, ' ')}</p>
                        </div>
                      )}
                      {denuncia.impacto && (
                        <div className="p-2 bg-neutral-50 border border-neutral-200">
                          <p className="text-xs text-neutral-400 mb-0.5">Impacto</p>
                          <p className="text-xs font-semibold text-neutral-700">{denuncia.impacto.replace(/_/g, ' ')}</p>
                        </div>
                      )}
                      {denuncia.envolvidos && (
                        <div className="p-2 bg-neutral-50 border border-neutral-200">
                          <p className="text-xs text-neutral-400 mb-0.5">Outros envolvidos</p>
                          <p className="text-xs font-semibold text-neutral-700">{denuncia.envolvidos.replace(/_/g, ' ')}</p>
                        </div>
                      )}
                      {denuncia.comunicada && (
                        <div className="p-2 bg-neutral-50 border border-neutral-200">
                          <p className="text-xs text-neutral-400 mb-0.5">Já comunicada</p>
                          <p className="text-xs font-semibold text-neutral-700">{denuncia.comunicada.replace(/_/g, ' ')}</p>
                        </div>
                      )}
                      {denuncia.desejaRetorno && (
                        <div className="p-2 bg-neutral-50 border border-neutral-200">
                          <p className="text-xs text-neutral-400 mb-0.5">Deseja retorno</p>
                          <p className="text-xs font-semibold text-neutral-700">{denuncia.desejaRetorno.replace(/_/g, ' ')}</p>
                        </div>
                      )}
                    </div>

                    {/* Código de protocolo */}
                    {denuncia.codigoProtocolo && (
                      <div className="flex items-center gap-2 p-3 bg-neutral-100 border border-neutral-300">
                        <Hash className="w-4 h-4 text-neutral-500" />
                        <span className="text-xs text-neutral-500">Código de Protocolo:</span>
                        <span className="font-black tracking-widest text-neutral-900">{denuncia.codigoProtocolo}</span>
                      </div>
                    )}

                    {/* Comentário do RH */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-neutral-500" />
                        <p className="text-sm font-bold text-neutral-700">Comentário para o denunciante</p>
                      </div>
                      <Textarea
                        placeholder="Escreva um comentário que será visível para o denunciante ao consultar o código de protocolo..."
                        value={comentarioRH}
                        onChange={(e) => setComentarioRH(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* Status actions */}
                    <div className="pt-2">
                      <p className="text-sm font-bold mb-3">Alterar Status:</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={denuncia.status === 'PENDENTE' ? 'primary' : 'outline'}
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(denuncia.id, 'PENDENTE'); }}
                        >
                          Pendente
                        </Button>
                        <Button
                          size="sm"
                          variant={denuncia.status === 'EM_ANALISE' ? 'primary' : 'outline'}
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(denuncia.id, 'EM_ANALISE'); }}
                        >
                          Em Análise
                        </Button>
                        <Button
                          size="sm"
                          variant={denuncia.status === 'RESOLVIDA' ? 'primary' : 'outline'}
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(denuncia.id, 'RESOLVIDA'); }}
                        >
                          Resolvida
                        </Button>
                        <Button
                          size="sm"
                          variant={denuncia.status === 'ARQUIVADA' ? 'secondary' : 'outline'}
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(denuncia.id, 'ARQUIVADA'); }}
                        >
                          Arquivar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
              );
            })}

            {denuncias.length === 0 && (
              <Card className="text-center py-12">
                <AlertTriangle className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500">Nenhuma denúncia encontrada</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
