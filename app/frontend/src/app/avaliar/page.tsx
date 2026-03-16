'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Star, ThumbsUp, Lightbulb, AlertCircle, Send } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Rating } from '@/components/ui/Rating';
import { Avatar } from '@/components/ui/Avatar';
import { Loading } from '@/components/ui/Loading';
import { gestoresAPI, avaliacoesAPI } from '@/lib/api';

export default function AvaliarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedGestor = searchParams.get('gestor');

  const [gestores, setGestores] = useState<any[]>([]);
  const [selectedGestorId, setSelectedGestorId] = useState(preSelectedGestor || '');
  const [selectedGestor, setSelectedGestor] = useState<any>(null);
  const [nota, setNota] = useState(8);
  const [elogio, setElogio] = useState('');
  const [sugestao, setSugestao] = useState('');
  const [critica, setCritica] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadGestores();
  }, []);

  useEffect(() => {
    if (selectedGestorId) {
      const gestor = gestores.find((g) => g.id === selectedGestorId);
      setSelectedGestor(gestor);
    } else {
      setSelectedGestor(null);
    }
  }, [selectedGestorId, gestores]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGestorId) {
      toast.error('Selecione um gestor para avaliar');
      return;
    }

    if (!elogio && !sugestao && !critica) {
      toast.error('Adicione pelo menos um comentário (elogio, sugestão ou crítica)');
      return;
    }

    setSubmitting(true);

    try {
      await avaliacoesAPI.create({
        gestorId: selectedGestorId,
        nota,
        elogio: elogio || undefined,
        sugestao: sugestao || undefined,
        critica: critica || undefined,
      });

      toast.success('Avaliação enviada com sucesso!');
      router.push(`/gestores/${selectedGestorId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao enviar avaliação');
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

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6">
          <ArrowLeft className="w-5 h-5" />
          Voltar ao dashboard
        </Link>

        <Card>
          <CardTitle className="flex items-center gap-2 mb-6">
            <Star className="w-6 h-6 text-gold-400" />
            Avaliar Gestor
          </CardTitle>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loading />
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                {/* Seleção do Gestor */}
                <div>
                  <Select
                    label="Selecione o Gestor"
                    options={gestorOptions}
                    value={selectedGestorId}
                    onChange={(e) => setSelectedGestorId(e.target.value)}
                  />

                  {selectedGestor && (
                    <div className="mt-4 p-4 bg-neutral-50 border-2 border-neutral-200 flex items-center gap-4">
                      <Avatar src={selectedGestor.foto} alt={selectedGestor.user?.nome} size="md" />
                      <div>
                        <p className="font-bold text-neutral-900">{selectedGestor.user?.nome}</p>
                        <p className="text-sm text-neutral-600">{selectedGestor.cargo}</p>
                        {selectedGestor.departamento && (
                          <p className="text-xs text-neutral-500">{selectedGestor.departamento}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Nota */}
                <div>
                  <label className="label">Nota (1 a 10)</label>
                  <div className="mt-2">
                    <Rating value={nota} onChange={setNota} size="lg" />
                  </div>
                </div>

                {/* Elogio */}
                <div className="p-4 bg-green-50 border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsUp className="w-5 h-5 text-green-600" />
                    <span className="font-bold text-green-800">Elogio</span>
                    <span className="text-sm text-green-600">(opcional)</span>
                  </div>
                  <Textarea
                    placeholder="O que você gostaria de elogiar neste gestor?"
                    value={elogio}
                    onChange={(e) => setElogio(e.target.value)}
                    className="border-green-300 focus:ring-green-500"
                  />
                </div>

                {/* Sugestão */}
                <div className="p-4 bg-blue-50 border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-blue-800">Sugestão</span>
                    <span className="text-sm text-blue-600">(opcional)</span>
                  </div>
                  <Textarea
                    placeholder="Você tem alguma sugestão de melhoria?"
                    value={sugestao}
                    onChange={(e) => setSugestao(e.target.value)}
                    className="border-blue-300 focus:ring-blue-500"
                  />
                </div>

                {/* Crítica */}
                <div className="p-4 bg-orange-50 border-2 border-orange-200">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <span className="font-bold text-orange-800">Crítica Construtiva</span>
                    <span className="text-sm text-orange-600">(opcional)</span>
                  </div>
                  <Textarea
                    placeholder="Existe algo que poderia melhorar?"
                    value={critica}
                    onChange={(e) => setCritica(e.target.value)}
                    className="border-orange-300 focus:ring-orange-500"
                  />
                </div>

                {/* Info */}
                <div className="p-4 bg-neutral-100 border-2 border-neutral-300">
                  <p className="text-sm text-neutral-600">
                    <strong>Nota:</strong> Sua avaliação será pública e visível para todos os colaboradores.
                    Seu nome será exibido junto à avaliação.
                  </p>
                </div>

                {/* Submit */}
                <Button type="submit" loading={submitting} className="w-full">
                  <Send className="w-5 h-5" />
                  Enviar Avaliação
                </Button>
              </CardContent>
            </form>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
