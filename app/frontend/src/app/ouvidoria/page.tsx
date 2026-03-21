'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AlertTriangle, Shield, Eye, EyeOff, Send, Copy, CheckCheck } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Loading } from '@/components/ui/Loading';
import { gestoresAPI, denunciasAPI } from '@/lib/api';

const tiposManifestacao = [
  { value: '', label: 'Selecione o tipo' },
  { value: 'DENUNCIA', label: 'Denúncia' },
  { value: 'RECLAMACAO', label: 'Reclamação' },
  { value: 'SUGESTAO_MELHORIA', label: 'Sugestão de melhoria' },
  { value: 'ELOGIO', label: 'Elogio' },
  { value: 'DUVIDA', label: 'Dúvida' },
  { value: 'OUTRO', label: 'Outro' },
];

const temasOptions = [
  'Conduta ética ou comportamento inadequado',
  'Assédio moral',
  'Assédio sexual',
  'Discriminação (gênero, raça, idade, religião, orientação sexual, deficiência, etc.)',
  'Relacionamento com liderança',
  'Clima organizacional',
  'Comunicação interna',
  'Sobrecarga de trabalho / metas excessivas',
  'Saúde mental e bem-estar',
  'Falta de respeito no ambiente de trabalho',
  'Conflitos entre colegas',
  'Processos internos ineficientes',
  'Falhas de gestão ou liderança',
  'Injustiça ou favorecimento indevido',
  'Segurança no trabalho',
  'Descumprimento de normas ou políticas internas',
  'Outros',
];

const frequenciaOptions = [
  { value: '', label: 'Selecione' },
  { value: 'UMA_VEZ', label: 'Uma única vez' },
  { value: 'MAIS_DE_UMA_VEZ', label: 'Mais de uma vez' },
  { value: 'FREQUENTE', label: 'Ocorre com frequência' },
];

const impactoOptions = [
  { value: '', label: 'Selecione' },
  { value: 'DESEMPENHO', label: 'Impacta meu desempenho' },
  { value: 'SAUDE_MENTAL', label: 'Impacta minha saúde emocional ou mental' },
  { value: 'CLIMA_EQUIPE', label: 'Impacta o clima da equipe' },
  { value: 'RESULTADOS', label: 'Impacta os resultados da área' },
  { value: 'NAO_SEI', label: 'Não sei avaliar' },
];

const envolvidosOptions = [
  { value: '', label: 'Selecione' },
  { value: 'SIM', label: 'Sim' },
  { value: 'NAO', label: 'Não' },
  { value: 'NAO_SEI', label: 'Não sei' },
];

const comunicadaOptions = [
  { value: '', label: 'Selecione' },
  { value: 'LIDERANCA', label: 'Sim, à liderança' },
  { value: 'RH', label: 'Sim, ao RH' },
  { value: 'OUTRO_CANAL', label: 'Sim, a outro canal' },
  { value: 'NAO', label: 'Não' },
];

const retornoOptions = [
  { value: '', label: 'Selecione' },
  { value: 'SIM', label: 'Sim' },
  { value: 'NAO', label: 'Não' },
];

export default function OuvidoriaPage() {
  const router = useRouter();
  const [gestores, setGestores] = useState<any[]>([]);
  const [selectedGestorId, setSelectedGestorId] = useState('');
  const [selectedGestor, setSelectedGestor] = useState<any>(null);
  const [tipoManifestacao, setTipoManifestacao] = useState('');
  const [temas, setTemas] = useState<string[]>([]);
  const [descricao, setDescricao] = useState('');
  const [descricaoComplementar, setDescricaoComplementar] = useState('');
  const [frequencia, setFrequencia] = useState('');
  const [impacto, setImpacto] = useState('');
  const [envolvidos, setEnvolvidos] = useState('');
  const [comunicada, setComunicada] = useState('');
  const [desejaRetorno, setDesejaRetorno] = useState('');
  const [declaracao, setDeclaracao] = useState(false);
  const [anonima, setAnonima] = useState(true);
  const [nomeIdentificado, setNomeIdentificado] = useState('');
  const [setorIdentificado, setSetorIdentificado] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [codigoProtocolo, setCodigoProtocolo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

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

    if (!tipoManifestacao) {
      toast.error('Selecione o tipo de manifestação');
      return;
    }

    if (temas.length === 0) {
      toast.error('Selecione pelo menos um tema');
      return;
    }

    if (descricao.length < 10) {
      toast.error('A descrição deve ter pelo menos 10 caracteres');
      return;
    }

    if (descricaoComplementar.length < 10) {
      toast.error('A descrição complementar deve ter pelo menos 10 caracteres');
      return;
    }

    if (!frequencia) {
      toast.error('Selecione a frequência');
      return;
    }

    if (!impacto) {
      toast.error('Selecione o impacto');
      return;
    }

    if (!envolvidos) {
      toast.error('Selecione se alguém mais está envolvido');
      return;
    }

    if (!comunicada) {
      toast.error('Selecione se a situação já foi comunicada');
      return;
    }

    if (!desejaRetorno) {
      toast.error('Selecione se deseja receber retorno');
      return;
    }

    if (!declaracao) {
      toast.error('Você precisa concordar com a declaração final');
      return;
    }

    setSubmitting(true);

    try {
      const response = await denunciasAPI.create({
        gestorId: selectedGestorId,
        tipoManifestacao,
        temas,
        descricao,
        descricaoComplementar,
        frequencia,
        impacto,
        envolvidos,
        comunicada,
        desejaRetorno,
        declaracao,
        anonima,
        ...(!anonima && { nomeIdentificado, setorIdentificado }),
      });

      toast.success('Denúncia registrada com sucesso. O RH será notificado.');
      setCodigoProtocolo(response.data.codigoProtocolo);
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

  const handleCopiar = () => {
    if (!codigoProtocolo) return;
    navigator.clipboard.writeText(codigoProtocolo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  if (codigoProtocolo) {
    return (
      <PublicLayout>
        <div className="max-w-lg mx-auto text-center py-8">
          <div className="w-20 h-20 bg-green-100 border-3 border-neutral-900 flex items-center justify-center mx-auto mb-6">
            <CheckCheck className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-display font-bold text-neutral-900 mb-2">Denúncia Registrada!</h1>
          <p className="text-neutral-600 mb-8">
            O RH foi notificado e irá analisar sua manifestação com sigilo.
          </p>

          <div className="bg-white border-3 border-neutral-900 p-8 shadow-brutal mb-6">
            <p className="text-sm font-bold text-neutral-500 uppercase mb-3">Seu Código de Protocolo</p>
            <div className="text-5xl font-black tracking-[0.3em] text-neutral-900 mb-4">
              {codigoProtocolo}
            </div>
            <button
              onClick={handleCopiar}
              className="flex items-center gap-2 mx-auto px-4 py-2 border-2 border-neutral-900 text-sm font-semibold hover:bg-neutral-100 transition-colors"
            >
              {copiado ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copiado ? 'Copiado!' : 'Copiar código'}
            </button>
          </div>

          <div className="p-4 bg-yellow-50 border-2 border-yellow-300 text-left mb-6">
            <p className="font-bold text-yellow-800 mb-1">⚠️ Guarde este código!</p>
            <p className="text-sm text-yellow-700">
              Este código é a única forma de consultar o andamento da sua denúncia.
              Ele não será enviado por e-mail ou qualquer outro canal.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/consultar-denuncia"
              className="px-6 py-3 bg-neutral-900 text-white font-bold border-2 border-neutral-900 hover:bg-neutral-700 transition-colors"
            >
              Consultar Andamento
            </Link>
            <Link
              href="/"
              className="px-6 py-3 font-bold border-2 border-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              Voltar ao Início
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto">
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

                <Select
                  label="Tipo de manifestação"
                  options={tiposManifestacao}
                  value={tipoManifestacao}
                  onChange={(e) => setTipoManifestacao(e.target.value)}
                />

                <div>
                  <p className="font-bold text-neutral-900 mb-2">Temas abordados</p>
                  <p className="text-sm text-neutral-600 mb-3">
                    Selecione o(s) tema(s) relacionado(s) à sua manifestação:
                  </p>
                  <div className="space-y-2">
                    {temasOptions.map((t) => {
                      const checked = temas.includes(t);
                      return (
                        <label
                          key={t}
                          className="flex items-start gap-3 p-3 bg-white border-2 border-neutral-200 hover:border-neutral-300 transition-colors cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={checked}
                            onChange={() => {
                              setTemas((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
                            }}
                          />
                          <span className="text-sm text-neutral-800">{t}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <Textarea
                    label="Descrição da manifestação"
                    placeholder="Descreva em detalhes o ocorrido. Inclua datas, locais e outras informações relevantes."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={6}
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Mínimo de 10 caracteres. Quanto mais detalhes, melhor.
                  </p>
                </div>

                <div>
                  <Textarea
                    label="Descrição complementar"
                    placeholder="Descreva com o máximo de detalhes possível o ocorrido ou sua sugestão."
                    value={descricaoComplementar}
                    onChange={(e) => setDescricaoComplementar(e.target.value)}
                    rows={6}
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Sempre que possível, informe fatos, datas, locais, envolvidos (nomes ou cargos) e impactos.
                  </p>
                </div>

                <Select
                  label="Essa situação ocorreu"
                  options={frequenciaOptions}
                  value={frequencia}
                  onChange={(e) => setFrequencia(e.target.value)}
                />

                <Select
                  label="Qual o impacto dessa situação?"
                  options={impactoOptions}
                  value={impacto}
                  onChange={(e) => setImpacto(e.target.value)}
                />

                <Select
                  label="Alguém mais está envolvido ou vivencia a mesma situação?"
                  options={envolvidosOptions}
                  value={envolvidos}
                  onChange={(e) => setEnvolvidos(e.target.value)}
                />

                <Select
                  label="A situação já foi comunicada a alguém da empresa?"
                  options={comunicadaOptions}
                  value={comunicada}
                  onChange={(e) => setComunicada(e.target.value)}
                />

                <Select
                  label="Deseja receber retorno sobre esta manifestação?"
                  options={retornoOptions}
                  value={desejaRetorno}
                  onChange={(e) => setDesejaRetorno(e.target.value)}
                />

                <div className="p-4 bg-neutral-50 border-2 border-neutral-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={declaracao}
                      onChange={(e) => setDeclaracao(e.target.checked)}
                    />
                    <span className="text-sm text-neutral-800">
                      Declaro que as informações prestadas são verdadeiras, de acordo com meu conhecimento, e estou ciente
                      de que este canal deve ser utilizado de forma ética e responsável.
                    </span>
                  </label>
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

                {/* Identificação (quando não anônima) */}
                {!anonima && (
                  <div className="p-4 bg-blue-50 border-2 border-blue-200 space-y-4">
                    <p className="font-bold text-blue-900">Sua identificação</p>
                    <Input
                      label="Seu nome"
                      placeholder="Digite seu nome completo"
                      value={nomeIdentificado}
                      onChange={(e) => setNomeIdentificado(e.target.value)}
                    />
                    <Input
                      label="Seu setor"
                      placeholder="Digite o setor em que você trabalha"
                      value={setorIdentificado}
                      onChange={(e) => setSetorIdentificado(e.target.value)}
                    />
                  </div>
                )}

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
    </PublicLayout>
  );
}
