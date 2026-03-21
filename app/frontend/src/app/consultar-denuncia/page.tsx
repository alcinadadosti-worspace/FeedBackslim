'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Clock, CheckCircle, Archive, AlertTriangle, MessageSquare } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { denunciasAPI } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDENTE: {
    label: 'Pendente',
    color: 'bg-yellow-400 border-yellow-600 text-yellow-900',
    icon: <Clock className="w-5 h-5" />,
  },
  EM_ANALISE: {
    label: 'Em Análise',
    color: 'bg-blue-400 border-blue-600 text-blue-900',
    icon: <Search className="w-5 h-5" />,
  },
  RESOLVIDA: {
    label: 'Resolvida',
    color: 'bg-green-400 border-green-600 text-green-900',
    icon: <CheckCircle className="w-5 h-5" />,
  },
  ARQUIVADA: {
    label: 'Arquivada',
    color: 'bg-neutral-400 border-neutral-600 text-neutral-900',
    icon: <Archive className="w-5 h-5" />,
  },
};

const tipoManifestacaoLabels: Record<string, string> = {
  DENUNCIA: 'Denúncia',
  RECLAMACAO: 'Reclamação',
  SUGESTAO_MELHORIA: 'Sugestão de melhoria',
  ELOGIO: 'Elogio',
  DUVIDA: 'Dúvida',
  OUTRO: 'Outro',
};

export default function ConsultarDenunciaPage() {
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault();
    const codigoLimpo = codigo.trim();
    if (codigoLimpo.length !== 6 || !/^\d{6}$/.test(codigoLimpo)) {
      setErro('O código deve ter exatamente 6 dígitos numéricos.');
      return;
    }
    setErro('');
    setResultado(null);
    setLoading(true);
    try {
      const response = await denunciasAPI.consultar(codigoLimpo);
      setResultado(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setErro('Código não encontrado. Verifique se digitou corretamente.');
      } else {
        setErro('Erro ao consultar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const statusInfo = resultado ? statusConfig[resultado.status] : null;

  return (
    <PublicLayout>
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-400 border-3 border-neutral-900 flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold text-neutral-900">Consultar Denúncia</h1>
          </div>
          <p className="text-neutral-600">
            Digite o código de protocolo recebido ao registrar sua denúncia para consultar o andamento.
          </p>
        </div>

        <Card className="mb-6">
          <CardTitle className="mb-6">Código de Protocolo</CardTitle>
          <CardContent>
            <form onSubmit={handleConsultar} className="space-y-4">
              <div>
                <Input
                  label="Código (6 dígitos)"
                  placeholder="Ex: 483921"
                  value={codigo}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCodigo(v);
                    setErro('');
                    setResultado(null);
                  }}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-bold"
                />
                {erro && (
                  <p className="text-sm text-red-600 mt-2 font-medium">{erro}</p>
                )}
              </div>
              <Button type="submit" loading={loading} className="w-full">
                <Search className="w-5 h-5" />
                Consultar Andamento
              </Button>
            </form>
          </CardContent>
        </Card>

        {resultado && statusInfo && (
          <Card>
            <CardTitle className="mb-6">Andamento da Denúncia</CardTitle>
            <CardContent className="space-y-5">
              {/* Status */}
              <div className={`flex items-center gap-3 p-4 border-2 ${statusInfo.color}`}>
                {statusInfo.icon}
                <div>
                  <p className="text-xs font-bold uppercase opacity-70">Status atual</p>
                  <p className="text-xl font-black">{statusInfo.label}</p>
                </div>
              </div>

              {/* Informações básicas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-50 border border-neutral-200">
                  <p className="text-xs text-neutral-400 mb-1">Tipo</p>
                  <p className="text-sm font-semibold text-neutral-800">
                    {tipoManifestacaoLabels[resultado.tipoManifestacao] || resultado.tipoManifestacao || '—'}
                  </p>
                </div>
                <div className="p-3 bg-neutral-50 border border-neutral-200">
                  <p className="text-xs text-neutral-400 mb-1">Registrada em</p>
                  <p className="text-sm font-semibold text-neutral-800">
                    {resultado.createdAt
                      ? format(new Date(resultado.createdAt), 'dd/MM/yyyy', { locale: ptBR })
                      : '—'}
                  </p>
                </div>
                {resultado.updatedAt && resultado.updatedAt !== resultado.createdAt && (
                  <div className="p-3 bg-neutral-50 border border-neutral-200 col-span-2">
                    <p className="text-xs text-neutral-400 mb-1">Última atualização</p>
                    <p className="text-sm font-semibold text-neutral-800">
                      {format(new Date(resultado.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>

              {/* Comentário do RH */}
              {resultado.comentarioRH ? (
                <div className="p-4 bg-blue-50 border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-bold text-blue-800">Comentário do RH</p>
                  </div>
                  <p className="text-sm text-neutral-700">{resultado.comentarioRH}</p>
                </div>
              ) : (
                <div className="p-4 bg-neutral-50 border border-neutral-200 text-center">
                  <p className="text-sm text-neutral-500">
                    Nenhum comentário do RH ainda. Acompanhe as atualizações pelo código de protocolo.
                  </p>
                </div>
              )}

              <div className="pt-2 text-center">
                <p className="text-xs text-neutral-400">
                  Protocolo: <span className="font-bold tracking-widest">{resultado.codigoProtocolo}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors">
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
