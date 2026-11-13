'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, AlertTriangle, Eye, EyeOff, ChevronDown, ChevronUp, User, Building2, Hash, History, Paperclip, MessageSquare, Send } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { Textarea } from '@/components/ui/Textarea';
import { HistoricoDenuncia } from '@/components/denuncia/HistoricoDenuncia';
import { ProvaView } from '@/components/denuncia/ProvaView';
import { denunciasAPI, denunciaAndamentoAPI, ItemHistoricoDenuncia, ProvaDenuncia } from '@/lib/api';
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
  const [historicoAtualizadoEm, setHistoricoAtualizadoEm] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const linkDoSlackTratado = useRef(false);

  useEffect(() => { loadDenuncias(1); }, [tipo, status]);

  // Link do Slack (?id=...): abre aquela denúncia uma única vez, mesmo que ela não esteja
  // entre as primeiras da lista
  useEffect(() => {
    const id = searchParams.get('id');
    if (!id || loading || linkDoSlackTratado.current) return;
    linkDoSlackTratado.current = true;

    const abrir = (denuncia: any) => {
      setSelectedDenuncia(denuncia);
      setTimeout(() => {
        document.getElementById(`denuncia-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    };

    const naLista = denuncias.find((d) => d.id === id);
    if (naLista) {
      abrir(naLista);
      return;
    }
    denunciasAPI
      .getById(id)
      .then((response) => {
        setDenuncias((prev) => (prev.some((d) => d.id === id) ? prev : [response.data, ...prev]));
        abrir(response.data);
      })
      .catch(() => toast.error('Denúncia do link não encontrada.'));
  }, [searchParams, denuncias, loading]);

  const loadDenuncias = async (paginaDesejada: number) => {
    const carregandoProxima = paginaDesejada > 1;
    if (carregandoProxima) setCarregandoMais(true);
    try {
      const params: any = { page: paginaDesejada, limit: 20 };
      if (tipo) params.tipo = tipo;
      if (status) params.status = status;
      const response = await denunciasAPI.list(params);
      const novas = response.data.data || [];
      setDenuncias((prev) => {
        if (!carregandoProxima) return novas;
        const ids = new Set(prev.map((d) => d.id));
        return [...prev, ...novas.filter((d: any) => !ids.has(d.id))];
      });
      setPagina(paginaDesejada);
      setTotalPaginas(response.data.pagination?.pages || 1);
    } catch (error) {
      console.error('Erro ao carregar denúncias:', error);
      toast.error('Não foi possível carregar as denúncias. Tente novamente.');
    } finally {
      setLoading(false);
      setCarregandoMais(false);
    }
  };

  const handleStatusChange = async (denunciaId: string, newStatus: string) => {
    try {
      await denunciasAPI.updateStatus(denunciaId, newStatus);
      toast.success('Status atualizado com sucesso!');
      setDenuncias((prev) => prev.map((d) => (d.id === denunciaId ? { ...d, status: newStatus } : d)));
      // A mudança de status entra no histórico; recarrega para aparecer na hora
      setHistoricoAtualizadoEm(Date.now());
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar status');
    }
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 mb-4 sm:mb-6">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao painel
        </Link>

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-neutral-900 dark:text-neutral-100">Denúncias</h1>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 mt-1">Gerencie todas as denúncias da ouvidoria</p>
        </div>

        {/* Filters */}
        <Card className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="w-full sm:w-48">
              <Select label="Tipo" options={tiposOptions} value={tipo} onChange={(e) => setTipo(e.target.value)} />
            </div>
            <div className="w-full sm:w-48">
              <Select label="Status" options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value)} />
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12"><Loading size="lg" /></div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {denuncias.map((denuncia) => {
              const isOpen = selectedDenuncia?.id === denuncia.id;
              const denunciadoNome = denuncia.gestor?.user?.nome || denuncia.colaboradorNome || 'Desconhecido';
              const isColaborador = !denuncia.gestor && !!denuncia.colaboradorNome;
              return (
                <Card key={denuncia.id} id={`denuncia-${denuncia.id}`} className={`transition-all ${isOpen ? 'ring-2 ring-primary-500' : ''}`}>
                  {/* Header row */}
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => setSelectedDenuncia(isOpen ? null : denuncia)}
                  >
                    <Avatar src={denuncia.gestor?.foto} alt={denunciadoNome} size="sm" className="shrink-0 mt-0.5" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1.5 mb-1 flex-wrap">
                        <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{denunciadoNome}</h3>
                        {isColaborador && (
                          <span className="px-1.5 py-0.5 text-xs font-bold border border-neutral-400 text-neutral-500 dark:text-neutral-400">Col.</span>
                        )}
                        <Badge variant="danger" className="text-xs">{denuncia.tipo.replace(/_/g, ' ')}</Badge>
                        <span className={`px-1.5 py-0.5 text-xs font-bold border-2 border-neutral-900 ${statusColors[denuncia.status]}`}>
                          {denuncia.status.replace(/_/g, ' ')}
                        </span>
                        {denuncia.anexosCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold border-2 border-neutral-900 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200">
                            <Paperclip className="w-3 h-3" />
                            {denuncia.anexosCount} {denuncia.anexosCount === 1 ? 'prova' : 'provas'}
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">{denuncia.descricao}</p>

                      <div className="flex items-center gap-3 text-xs text-neutral-400 dark:text-neutral-500 mt-1.5">
                        <span className="flex items-center gap-1">
                          {denuncia.anonima ? <><EyeOff className="w-3 h-3" /> Anônima</> : <><Eye className="w-3 h-3" /> Identificada</>}
                        </span>
                        <span>{format(new Date(denuncia.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-neutral-400 mt-0.5">
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="mt-4 pt-4 border-t-2 border-neutral-200 dark:border-neutral-700 space-y-4">
                      {!denuncia.anonima && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 space-y-1">
                          <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-2">Identificação do Denunciante</p>
                          <div className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                            <User className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>Nome: <strong>{denuncia.nomeIdentificado || '—'}</strong></span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                            <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>Setor: <strong>{denuncia.setorIdentificado || '—'}</strong></span>
                          </div>
                        </div>
                      )}

                      {denuncia.temas?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase mb-2">Temas abordados</p>
                          <div className="flex flex-wrap gap-1.5">
                            {denuncia.temas.map((tema: string) => (
                              <span key={tema} className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-xs text-neutral-700 dark:text-neutral-300">
                                {tema}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase mb-1">Descrição</p>
                        <p className="text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 p-3">{denuncia.descricao}</p>
                      </div>

                      {denuncia.descricaoComplementar && (
                        <div>
                          <p className="text-xs font-bold text-neutral-500 uppercase mb-1">Descrição Complementar</p>
                          <p className="text-sm text-neutral-700 bg-neutral-50 border border-neutral-200 p-3">{denuncia.descricaoComplementar}</p>
                        </div>
                      )}

                      {/* Grid de detalhes */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {denuncia.frequencia && (
                          <div className="p-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600">
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-0.5">Frequência</p>
                            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{denuncia.frequencia.replace(/_/g, ' ')}</p>
                          </div>
                        )}
                        {denuncia.impacto && (
                          <div className="p-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600">
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-0.5">Impacto</p>
                            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{denuncia.impacto.replace(/_/g, ' ')}</p>
                          </div>
                        )}
                        {denuncia.envolvidos && (
                          <div className="p-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600">
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-0.5">Outros envolvidos</p>
                            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{denuncia.envolvidos.replace(/_/g, ' ')}</p>
                          </div>
                        )}
                        {denuncia.comunicada && (
                          <div className="p-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600">
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-0.5">Já comunicada</p>
                            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{denuncia.comunicada.replace(/_/g, ' ')}</p>
                          </div>
                        )}
                        {denuncia.desejaRetorno && (
                          <div className="p-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600">
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-0.5">Deseja retorno</p>
                            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{denuncia.desejaRetorno.replace(/_/g, ' ')}</p>
                          </div>
                        )}
                      </div>

                      {denuncia.codigoProtocolo && (
                        <div className="flex items-center gap-2 p-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600">
                          <Hash className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">Protocolo:</span>
                          <span className="font-black tracking-widest text-sm text-neutral-900 dark:text-neutral-100">{denuncia.codigoProtocolo}</span>
                        </div>
                      )}

                      <div className="pt-2">
                        <p className="text-sm font-bold mb-2 sm:mb-3 dark:text-neutral-100">Alterar Status:</p>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant={denuncia.status === 'PENDENTE' ? 'primary' : 'outline'} onClick={(e) => { e.stopPropagation(); handleStatusChange(denuncia.id, 'PENDENTE'); }}>Pendente</Button>
                          <Button size="sm" variant={denuncia.status === 'EM_ANALISE' ? 'primary' : 'outline'} onClick={(e) => { e.stopPropagation(); handleStatusChange(denuncia.id, 'EM_ANALISE'); }}>Em Análise</Button>
                          <Button size="sm" variant={denuncia.status === 'RESOLVIDA' ? 'primary' : 'outline'} onClick={(e) => { e.stopPropagation(); handleStatusChange(denuncia.id, 'RESOLVIDA'); }}>Resolvida</Button>
                          <Button size="sm" variant={denuncia.status === 'ARQUIVADA' ? 'secondary' : 'outline'} onClick={(e) => { e.stopPropagation(); handleStatusChange(denuncia.id, 'ARQUIVADA'); }}>Arquivar</Button>
                        </div>
                      </div>

                      <AndamentoDenuncia
                        key={denuncia.id}
                        denunciaId={denuncia.id}
                        comentarioAntigo={denuncia.comentarioRH}
                        atualizarEm={historicoAtualizadoEm}
                      />
                    </div>
                  )}
                </Card>
              );
            })}

            {pagina < totalPaginas && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={() => loadDenuncias(pagina + 1)} loading={carregandoMais}>
                  Carregar mais denúncias
                </Button>
              </div>
            )}

            {denuncias.length === 0 && (
              <Card className="text-center py-12">
                <AlertTriangle className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500 dark:text-neutral-400">Nenhuma denúncia encontrada</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

// Provas enviadas pelo denunciante, histórico e campo para o RH deixar um comentário
function AndamentoDenuncia({
  denunciaId,
  comentarioAntigo,
  atualizarEm,
}: {
  denunciaId: string;
  comentarioAntigo?: string | null;
  atualizarEm: number;
}) {
  const [historico, setHistorico] = useState<ItemHistoricoDenuncia[]>([]);
  const [provas, setProvas] = useState<ProvaDenuncia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    Promise.all([denunciaAndamentoAPI.historico(denunciaId), denunciaAndamentoAPI.provas(denunciaId)])
      .then(([h, p]) => {
        if (!ativo) return;
        setHistorico(h.data.data || []);
        setProvas(p.data.data || []);
      })
      .catch(() => {
        if (ativo) toast.error('Não foi possível carregar o histórico e as provas desta denúncia.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [denunciaId]);

  // Depois de mudar o status, busca o histórico de novo para mostrar a mudança
  useEffect(() => {
    if (!atualizarEm) return;
    denunciaAndamentoAPI
      .historico(denunciaId)
      .then((h) => setHistorico(h.data.data || []))
      .catch((error) => console.error('Erro ao atualizar histórico:', error));
  }, [atualizarEm, denunciaId]);

  const baixarProva = useCallback(
    async (anexoId: string) => (await denunciaAndamentoAPI.baixarProva(denunciaId, anexoId)).data,
    [denunciaId]
  );

  const enviarComentario = async () => {
    const texto = comentario.trim();
    if (!texto) return;
    setEnviando(true);
    try {
      const resposta = await denunciaAndamentoAPI.comentar(denunciaId, texto);
      setHistorico((prev) => [...prev, resposta.data]);
      setComentario('');
      toast.success('Comentário enviado. O denunciante verá ao consultar o protocolo.');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao enviar comentário');
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex justify-center py-6">
        <Loading />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {provas.length > 0 && (
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-2">
            <Paperclip className="w-4 h-4 text-neutral-500" />
            Provas enviadas pelo denunciante ({provas.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {provas.map((prova) => (
              <ProvaView key={prova.id} prova={prova} baixar={baixarProva} />
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-2">
          <History className="w-4 h-4 text-neutral-500" />
          Histórico
        </p>
        <HistoricoDenuncia
          itens={historico}
          comentarioAntigo={comentarioAntigo}
          mostrarAutor
          vazio="Nenhum comentário ou mudança de status ainda."
        />
      </div>

      <div>
        <p className="flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-2">
          <MessageSquare className="w-4 h-4 text-neutral-500" />
          Comentário para o denunciante
        </p>
        <Textarea
          placeholder="Escreva um comentário que será visível para o denunciante. Os comentários anteriores continuam no histórico."
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          maxLength={5000}
          rows={3}
        />
        <div className="flex justify-end mt-2">
          <Button size="sm" onClick={enviarComentario} loading={enviando} disabled={!comentario.trim()}>
            <Send className="w-4 h-4" />
            Enviar comentário
          </Button>
        </div>
      </div>
    </div>
  );
}
