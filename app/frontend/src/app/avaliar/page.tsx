'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Star, ThumbsUp, Lightbulb, AlertCircle, Send, Shield, Ban, Users, UserCheck, CheckCircle2 } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Rating } from '@/components/ui/Rating';
import { Avatar } from '@/components/ui/Avatar';
import { Loading } from '@/components/ui/Loading';
import { gestoresAPI, avaliacoesAPI, colaboradoresAPI, feedbacksColaboradorAPI } from '@/lib/api';

type TipoAvaliado = 'gestor' | 'colaborador';

export default function AvaliarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedGestor = searchParams.get('gestor');

  const [tipoAvaliado, setTipoAvaliado] = useState<TipoAvaliado>(preSelectedGestor ? 'gestor' : 'gestor');
  const [gestores, setGestores] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [selectedGestorId, setSelectedGestorId] = useState(preSelectedGestor || '');
  const [selectedGestor, setSelectedGestor] = useState<any>(null);
  const [selectedColaboradorSlackId, setSelectedColaboradorSlackId] = useState('');
  const [selectedColaborador, setSelectedColaborador] = useState<any>(null);
  const [nota, setNota] = useState(8);
  const [elogio, setElogio] = useState('');
  const [sugestao, setSugestao] = useState('');
  const [critica, setCritica] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasAlreadyEvaluated, setHasAlreadyEvaluated] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (tipoAvaliado === 'gestor') {
      if (selectedGestorId) {
        const gestor = gestores.find((g) => g.id === selectedGestorId);
        setSelectedGestor(gestor);
        const key = `ouvidoria_avaliou_${selectedGestorId}`;
        setHasAlreadyEvaluated(!!localStorage.getItem(key));
      } else {
        setSelectedGestor(null);
        setHasAlreadyEvaluated(false);
      }
    }
  }, [selectedGestorId, gestores, tipoAvaliado]);

  useEffect(() => {
    if (tipoAvaliado === 'colaborador') {
      if (selectedColaboradorSlackId) {
        const col = colaboradores.find((c) => c.slackId === selectedColaboradorSlackId);
        setSelectedColaborador(col);
        const key = `ouvidoria_avaliou_col_${selectedColaboradorSlackId}`;
        setHasAlreadyEvaluated(!!localStorage.getItem(key));
      } else {
        setSelectedColaborador(null);
        setHasAlreadyEvaluated(false);
      }
    }
  }, [selectedColaboradorSlackId, colaboradores, tipoAvaliado]);

  const loadData = async () => {
    try {
      const [gestoresRes, colaboradoresRes] = await Promise.allSettled([
        gestoresAPI.list(),
        colaboradoresAPI.list(),
      ]);
      if (gestoresRes.status === 'fulfilled') setGestores(gestoresRes.value.data);
      if (colaboradoresRes.status === 'fulfilled') setColaboradores(colaboradoresRes.value.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTipoChange = (tipo: TipoAvaliado) => {
    setTipoAvaliado(tipo);
    setHasAlreadyEvaluated(false);
    setElogio('');
    setSugestao('');
    setCritica('');
    setNota(8);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (tipoAvaliado === 'gestor' && !selectedGestorId) {
      toast.error('Selecione um gestor para avaliar');
      return;
    }
    if (tipoAvaliado === 'colaborador' && !selectedColaboradorSlackId) {
      toast.error('Selecione um colaborador para avaliar');
      return;
    }
    if (!elogio && !sugestao && !critica) {
      toast.error('Adicione pelo menos um comentário (elogio, sugestão ou crítica)');
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmation(false);
    setSubmitting(true);

    try {
      if (tipoAvaliado === 'gestor') {
        await avaliacoesAPI.create({
          gestorId: selectedGestorId,
          nota,
          elogio: elogio || undefined,
          sugestao: sugestao || undefined,
          critica: critica || undefined,
        });
        localStorage.setItem(`ouvidoria_avaliou_${selectedGestorId}`, '1');
        toast.success('Avaliação enviada com sucesso! Obrigado pelo seu feedback.');
      } else {
        await feedbacksColaboradorAPI.create({
          colaboradorSlackId: selectedColaboradorSlackId,
          nota,
          elogio: elogio || undefined,
          sugestao: sugestao || undefined,
          critica: critica || undefined,
        });
        localStorage.setItem(`ouvidoria_avaliou_col_${selectedColaboradorSlackId}`, '1');
        toast.success('Feedback enviado! O colaborador receberá uma notificação no Slack.');
      }
      router.push('/');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao enviar feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const gestorOptions = [
    { value: '', label: 'Selecione um gestor' },
    ...gestores.map((g) => ({
      value: g.id,
      label: `${g.user?.nome} - ${g.cargo}`,
    })),
  ];

  const colaboradorOptions = [
    { value: '', label: 'Selecione um colaborador' },
    ...colaboradores.map((c) => ({
      value: c.slackId,
      label: c.nome,
    })),
  ];

  const confirmNome = tipoAvaliado === 'gestor'
    ? selectedGestor?.user?.nome
    : selectedColaborador?.nome;

  return (
    <PublicLayout>
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-neutral-800 border-3 border-neutral-900 dark:border-neutral-100 shadow-brutal-lg p-5 sm:p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-7 h-7 text-primary-600 shrink-0" />
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Confirmar envio?</h2>
            </div>
            <p className="text-neutral-600 dark:text-neutral-300 mb-2">
              Você está enviando um feedback anônimo para{' '}
              <strong className="text-neutral-900 dark:text-neutral-100">{confirmNome}</strong> com nota{' '}
              <strong className="text-neutral-900 dark:text-neutral-100">{nota}/10</strong>.
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 py-2.5 font-semibold border-2 border-neutral-900 dark:border-neutral-100 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="flex-1 py-2.5 font-semibold bg-neutral-900 text-white border-2 border-neutral-900 hover:bg-neutral-700 transition-colors"
              >
                Confirmar Envio
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardTitle className="flex items-center gap-2 mb-6">
            <Star className="w-6 h-6 text-gold-400" />
            Enviar Feedback
          </CardTitle>

          {/* Toggle Gestor / Colaborador */}
          <div className="flex gap-2 mb-6 p-1 bg-neutral-100 dark:bg-neutral-700 border-2 border-neutral-200 dark:border-neutral-600">
            <button
              type="button"
              onClick={() => handleTipoChange('gestor')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 font-semibold text-sm transition-colors ${
                tipoAvaliado === 'gestor'
                  ? 'bg-white dark:bg-neutral-600 border-2 border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Avaliar Gestor
            </button>
            <button
              type="button"
              onClick={() => handleTipoChange('colaborador')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 font-semibold text-sm transition-colors ${
                tipoAvaliado === 'colaborador'
                  ? 'bg-white dark:bg-neutral-600 border-2 border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Avaliar Colaborador
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loading />
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                {/* Seleção */}
                {tipoAvaliado === 'gestor' ? (
                  <div>
                    <Select
                      label="Selecione o Gestor"
                      options={gestorOptions}
                      value={selectedGestorId}
                      onChange={(e) => setSelectedGestorId(e.target.value)}
                    />
                    {selectedGestor && (
                      <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-700 border-2 border-neutral-200 dark:border-neutral-600 flex items-center gap-4">
                        <Avatar src={selectedGestor.foto} alt={selectedGestor.user?.nome} size="md" />
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-neutral-100">{selectedGestor.user?.nome}</p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-300">{selectedGestor.cargo}</p>
                          {selectedGestor.departamento && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{selectedGestor.departamento}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <Select
                      label="Selecione o Colaborador"
                      options={colaboradorOptions}
                      value={selectedColaboradorSlackId}
                      onChange={(e) => setSelectedColaboradorSlackId(e.target.value)}
                    />
                    {selectedColaborador && (
                      <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-700 border-2 border-neutral-200 dark:border-neutral-600 flex items-center gap-4">
                        <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-600 border-2 border-neutral-300 dark:border-neutral-500 flex items-center justify-center font-bold text-neutral-600 dark:text-neutral-100">
                          {selectedColaborador.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-neutral-100">{selectedColaborador.nome}</p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Colaborador</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Nota */}
                <div>
                  <label className="label">Nota (1 a 10)</label>
                  <div className="mt-2">
                    <Rating value={nota} onChange={setNota} size="lg" />
                  </div>
                </div>

                {/* Elogio */}
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsUp className="w-5 h-5 text-green-600" />
                    <span className="font-bold text-green-800 dark:text-green-300">Elogio</span>
                    <span className="text-sm text-green-600 dark:text-green-400">(opcional)</span>
                  </div>
                  <Textarea
                    placeholder="O que você gostaria de elogiar?"
                    value={elogio}
                    onChange={(e) => setElogio(e.target.value)}
                    className="border-green-300 focus:ring-green-500"
                  />
                </div>

                {/* Sugestão */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-blue-800 dark:text-blue-300">Sugestão</span>
                    <span className="text-sm text-blue-600 dark:text-blue-400">(opcional)</span>
                  </div>
                  <Textarea
                    placeholder="Você tem alguma sugestão de melhoria?"
                    value={sugestao}
                    onChange={(e) => setSugestao(e.target.value)}
                    className="border-blue-300 focus:ring-blue-500"
                  />
                </div>

                {/* Crítica */}
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <span className="font-bold text-orange-800 dark:text-orange-300">Crítica Construtiva</span>
                    <span className="text-sm text-orange-600 dark:text-orange-400">(opcional)</span>
                  </div>
                  <Textarea
                    placeholder="Existe algo que poderia melhorar?"
                    value={critica}
                    onChange={(e) => setCritica(e.target.value)}
                    className="border-orange-300 focus:ring-orange-500"
                  />
                </div>

                {/* Info anonimato */}
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-400">
                    <strong>100% Anonimo:</strong> Sua avaliacao e completamente anonima.
                    {tipoAvaliado === 'colaborador' && (
                      <> O colaborador receberá uma notificação no Slack e poderá escolher se deseja tornar o feedback público no site.</>
                    )}
                    {tipoAvaliado === 'gestor' && (
                      <> Nao rastreamos sua identidade e o gestor nao sabera quem enviou o feedback.</>
                    )}
                  </p>
                </div>

                {/* Aviso de avaliação já enviada */}
                {hasAlreadyEvaluated && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-400 dark:border-orange-600 flex items-start gap-3">
                    <Ban className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-orange-700 dark:text-orange-400">
                      <strong>Feedback já enviado:</strong> Você já avaliou esta pessoa neste dispositivo. Só é permitido um feedback por pessoa.
                    </p>
                  </div>
                )}

                {/* Submit */}
                <Button type="submit" loading={submitting} disabled={hasAlreadyEvaluated} className="w-full">
                  <Send className="w-5 h-5" />
                  Enviar Feedback
                </Button>
              </CardContent>
            </form>
          )}
        </Card>
      </div>
    </PublicLayout>
  );
}
