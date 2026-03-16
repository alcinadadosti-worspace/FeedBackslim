'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, AlertTriangle, Shield, Eye, EyeOff, Send } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Loading } from '@/components/ui/Loading';
import { gestoresAPI, denunciasAPI } from '@/lib/api';

const tiposDenuncia = [
  { value: '', label: 'Selecione o tipo' },
  { value: 'ASSEDIO_MORAL', label: 'Assédio Moral' },
  { value: 'COMPORTAMENTO_INADEQUADO', label: 'Comportamento Inadequado' },
  { value: 'ABUSO_AUTORIDADE', label: 'Abuso de Autoridade' },
  { value: 'OUTROS', label: 'Outros' },
];

export default function OuvidoriaPage() {
  const router = useRouter();
  const [gestores, setGestores] = useState<any[]>([]);
  const [selectedGestorId, setSelectedGestorId] = useState('');
  const [selectedGestor, setSelectedGestor] = useState<any>(null);
  const [tipo, setTipo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [anonima, setAnonima] = useState(true);
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
      toast.error('Selecione o gestor');
      return;
    }

    if (!tipo) {
      toast.error('Selecione o tipo de denúncia');
      return;
    }

    if (descricao.length < 10) {
      toast.error('A descrição deve ter pelo menos 10 caracteres');
      return;
    }

    setSubmitting(true);

    try {
      await denunciasAPI.create({
        gestorId: selectedGestorId,
        tipo,
        descricao,
        anonima,
      });

      toast.success('Denúncia registrada com sucesso. O RH será notificado.');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao registrar denúncia');
    } finally {
      setSubmitting(false);
    }
  };

  const gestorOptions = [
    { value: '', label: 'Selecione o gestor' },
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

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-red-400 border-3 border-neutral-900 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold text-neutral-900">Ouvidoria</h1>
          </div>
          <p className="text-neutral-600">
            Registre denúncias de forma confidencial. Todas as informações serão tratadas com sigilo.
          </p>
        </div>

        <Card>
          <CardTitle className="flex items-center gap-2 mb-6">
            <Shield className="w-6 h-6 text-red-500" />
            Registrar Denúncia
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
                    label="Gestor Denunciado"
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
                      </div>
                    </div>
                  )}
                </div>

                {/* Tipo de Denúncia */}
                <Select
                  label="Tipo de Denúncia"
                  options={tiposDenuncia}
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                />

                {/* Descrição */}
                <div>
                  <Textarea
                    label="Descrição da Denúncia"
                    placeholder="Descreva em detalhes o ocorrido. Inclua datas, locais e outras informações relevantes."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={6}
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Mínimo de 10 caracteres. Quanto mais detalhes, melhor.
                  </p>
                </div>

                {/* Anonimato */}
                <div className="p-4 bg-neutral-100 border-2 border-neutral-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {anonima ? (
                        <EyeOff className="w-6 h-6 text-neutral-600" />
                      ) : (
                        <Eye className="w-6 h-6 text-neutral-600" />
                      )}
                      <div>
                        <p className="font-bold text-neutral-900">
                          {anonima ? 'Denúncia Anônima' : 'Denúncia Identificada'}
                        </p>
                        <p className="text-sm text-neutral-600">
                          {anonima
                            ? 'Sua identidade será protegida'
                            : 'Seu nome será visível para o RH'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAnonima(!anonima)}
                      className={`relative w-14 h-8 rounded-full transition-colors ${
                        anonima ? 'bg-primary-500' : 'bg-neutral-300'
                      } border-2 border-neutral-900`}
                    >
                      <span
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full border-2 border-neutral-900 transition-transform ${
                          anonima ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Aviso de Confidencialidade */}
                <div className="p-4 bg-yellow-50 border-2 border-yellow-300">
                  <div className="flex items-start gap-3">
                    <Shield className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-yellow-800">Confidencialidade Garantida</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Esta denúncia será tratada com total sigilo pelo departamento de RH.
                        O gestor será notificado de forma genérica, sem acesso aos detalhes ou
                        identificação do denunciante (se anônima).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <Button type="submit" variant="danger" loading={submitting} className="w-full">
                  <Send className="w-5 h-5" />
                  Enviar Denúncia
                </Button>
              </CardContent>
            </form>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
