'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, ThumbsUp, Lightbulb, AlertCircle, UserCheck, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { SmartLayout } from '@/components/layout/SmartLayout';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { SimpleRating } from '@/components/ui/Rating';
import { Loading } from '@/components/ui/Loading';
import { avaliacoesAPI, feedbacksColaboradorAPI } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Tab = 'gestores' | 'colaboradores';

const PAGE_SIZE = 20;

export default function FeedbacksPage() {
  const [tab, setTab] = useState<Tab>('gestores');

  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [avalTotal, setAvalTotal] = useState(0);
  const [avalPage, setAvalPage] = useState(1);
  const [avalPages, setAvalPages] = useState(1);
  const [avalLoading, setAvalLoading] = useState(true);

  const [feedbacksCol, setFeedbacksCol] = useState<any[]>([]);
  const [colTotal, setColTotal] = useState(0);
  const [colPage, setColPage] = useState(1);
  const [colPages, setColPages] = useState(1);
  const [colLoading, setColLoading] = useState(true);

  useEffect(() => {
    loadAvaliacoes(1);
    loadFeedbacksCol(1);
  }, []);

  const loadAvaliacoes = async (page: number) => {
    setAvalLoading(true);
    try {
      const res = await avaliacoesAPI.listPublicas({ page, limit: PAGE_SIZE });
      const { data, total, pages } = res.data;
      setAvaliacoes(data);
      setAvalTotal(total);
      setAvalPages(pages);
      setAvalPage(page);
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
    } finally {
      setAvalLoading(false);
    }
  };

  const loadFeedbacksCol = async (page: number) => {
    setColLoading(true);
    try {
      const res = await feedbacksColaboradorAPI.listTodosPublicos({ page, limit: PAGE_SIZE });
      const { data, total, pages } = res.data;
      setFeedbacksCol(data);
      setColTotal(total);
      setColPages(pages);
      setColPage(page);
    } catch (error) {
      console.error('Erro ao carregar feedbacks:', error);
    } finally {
      setColLoading(false);
    }
  };

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
  };

  const formatDate = (date: any) => {
    try {
      return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return '';
    }
  };

  const Pagination = ({
    page,
    pages,
    total,
    onPage,
  }: {
    page: number;
    pages: number;
    total: number;
    onPage: (p: number) => void;
  }) => {
    if (pages <= 1) return null;
    return (
      <div className="flex items-center justify-between mt-6 pt-4 border-t-2 border-neutral-200 dark:border-neutral-700">
        <span className="text-sm text-neutral-500 dark:text-neutral-400">{total} feedbacks no total</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            className="p-2 border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 dark:text-neutral-100" />
          </button>
          <span className="text-sm font-semibold px-2 dark:text-neutral-100">
            {page} / {pages}
          </span>
          <button
            onClick={() => onPage(page + 1)}
            disabled={page >= pages}
            className="p-2 border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4 dark:text-neutral-100" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <SmartLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-neutral-100">Feedbacks Públicos</h1>
          <p className="text-neutral-600 dark:text-neutral-300 mt-1">Feedbacks que foram compartilhados publicamente</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => handleTabChange('gestores')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 font-semibold text-sm transition-colors ${
              tab === 'gestores'
                ? 'bg-white dark:bg-neutral-700 border-2 border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Gestores
            {avalTotal > 0 && (
              <span className="bg-neutral-900 text-white text-xs px-1.5 py-0.5 font-bold">{avalTotal}</span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('colaboradores')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 font-semibold text-sm transition-colors ${
              tab === 'colaboradores'
                ? 'bg-white dark:bg-neutral-700 border-2 border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Colaboradores
            {colTotal > 0 && (
              <span className="bg-neutral-900 text-white text-xs px-1.5 py-0.5 font-bold">{colTotal}</span>
            )}
          </button>
        </div>

        {tab === 'gestores' ? (
          avalLoading ? (
            <div className="flex justify-center py-12"><Loading size="lg" /></div>
          ) : avaliacoes.length === 0 ? (
            <Card className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500">Nenhum feedback público de gestores ainda</p>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {avaliacoes.map((av: any) => (
                  <Card key={av.id}>
                    <div className="flex items-start gap-4">
                      <Link href={`/gestores/${av.gestor?.id}`} className="shrink-0">
                        <Avatar src={av.gestor?.foto} alt={av.gestor?.user?.nome} size="md" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <Link href={`/gestores/${av.gestor?.id}`} className="hover:underline">
                            <span className="font-bold text-neutral-900 dark:text-neutral-100">{av.gestor?.user?.nome || 'Gestor'}</span>
                            {av.gestor?.cargo && (
                              <span className="text-sm text-neutral-500 dark:text-neutral-400 ml-2">{av.gestor.cargo}</span>
                            )}
                          </Link>
                          <div className="flex items-center gap-3">
                            <SimpleRating value={av.nota} />
                            <span className="text-xs text-neutral-400 dark:text-neutral-500">{formatDate(av.createdAt)}</span>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {av.elogio && (
                            <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                              <ThumbsUp className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                <span className="font-semibold text-green-700 dark:text-green-400">Elogio: </span>{av.elogio}
                              </p>
                            </div>
                          )}
                          {av.sugestao && (
                            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                              <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                <span className="font-semibold text-blue-700 dark:text-blue-400">Sugestão: </span>{av.sugestao}
                              </p>
                            </div>
                          )}
                          {av.critica && (
                            <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                              <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                <span className="font-semibold text-orange-700 dark:text-orange-400">Crítica: </span>{av.critica}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <Pagination page={avalPage} pages={avalPages} total={avalTotal} onPage={loadAvaliacoes} />
            </>
          )
        ) : colLoading ? (
          <div className="flex justify-center py-12"><Loading size="lg" /></div>
        ) : (
          /* ---- FEEDBACKS DE COLABORADORES ---- */
          feedbacksCol.length === 0 ? (
            <Card className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500">Nenhum feedback público de colaboradores ainda</p>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {feedbacksCol.map((fb: any) => (
                  <Card key={fb.id}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-600 border-2 border-neutral-300 dark:border-neutral-500 flex items-center justify-center font-bold text-neutral-600 dark:text-neutral-100 shrink-0">
                        {fb.colaboradorNome?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <span className="font-bold text-neutral-900 dark:text-neutral-100">{fb.colaboradorNome}</span>
                          <div className="flex items-center gap-3">
                            <SimpleRating value={fb.nota} />
                            <span className="text-xs text-neutral-400 dark:text-neutral-500">{formatDate(fb.createdAt)}</span>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {fb.elogio && (
                            <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                              <ThumbsUp className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                <span className="font-semibold text-green-700 dark:text-green-400">Elogio: </span>{fb.elogio}
                              </p>
                            </div>
                          )}
                          {fb.sugestao && (
                            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                              <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                <span className="font-semibold text-blue-700 dark:text-blue-400">Sugestão: </span>{fb.sugestao}
                              </p>
                            </div>
                          )}
                          {fb.critica && (
                            <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                              <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                <span className="font-semibold text-orange-700 dark:text-orange-400">Crítica: </span>{fb.critica}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <Pagination page={colPage} pages={colPages} total={colTotal} onPage={loadFeedbacksCol} />
            </>
          )
        )}
      </div>
    </SmartLayout>
  );
}
