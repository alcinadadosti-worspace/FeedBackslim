'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AlertTriangle, Shield, Eye, EyeOff, Send, Copy, CheckCheck, CheckCircle2, UserCheck, Users, Paperclip, X, Loader2, XCircle, Clock } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Loading } from '@/components/ui/Loading';
import { gestoresAPI, denunciasAPI, colaboradoresAPI, provasDenunciaAPI } from '@/lib/api';
import {
  ACCEPT_PROVAS,
  MAX_BYTES_POR_PROVA,
  MAX_BYTES_PROVAS_POR_DENUNCIA,
  MAX_PROVAS_POR_DENUNCIA,
  formatarTamanho,
  provaPermitida,
} from '@/lib/provas';

type EnvioProva = {
  arquivo: File;
  status: 'aguardando' | 'enviando' | 'enviado' | 'erro';
  progresso: number;
  erro?: string;
};

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

type TipoDenunciado = 'gestor' | 'colaborador';

export default function OuvidoriaPage() {
  const router = useRouter();
  const [tipoDenunciado, setTipoDenunciado] = useState<TipoDenunciado>('gestor');
  const [gestores, setGestores] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [selectedGestorId, setSelectedGestorId] = useState('');
  const [selectedGestor, setSelectedGestor] = useState<any>(null);
  const [selectedColaboradorSlackId, setSelectedColaboradorSlackId] = useState('');
  const [selectedColaborador, setSelectedColaborador] = useState<any>(null);
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
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [codigoProtocolo, setCodigoProtocolo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Provas (fotos e vídeos): escolhidas no formulário e enviadas logo depois de a denúncia ser registrada
  const [provas, setProvas] = useState<File[]>([]);
  const [envios, setEnvios] = useState<EnvioProva[]>([]);
  const [tokenAnexos, setTokenAnexos] = useState<string | null>(null);
  const enviandoProvas = envios.some((e) => e.status === 'aguardando' || e.status === 'enviando');
  const provasComErro = envios.filter((e) => e.status === 'erro').length;

  // Avisa antes de fechar a página no meio do envio das provas
  useEffect(() => {
    if (!enviandoProvas) return;
    const aviso = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [enviandoProvas]);

  useEffect(() => {
    loadGestores();
  }, []);

  useEffect(() => {
    if (selectedGestorId) {
      const gestor = gestores.find((g) => g.id === selectedGestorId);
      setSelectedGestor(gestor ?? null);
    } else {
      setSelectedGestor(null);
    }
  }, [selectedGestorId, gestores]);

  useEffect(() => {
    if (selectedColaboradorSlackId) {
      const col = colaboradores.find((c) => c.slackId === selectedColaboradorSlackId);
      setSelectedColaborador(col ?? null);
    } else {
      setSelectedColaborador(null);
    }
  }, [selectedColaboradorSlackId, colaboradores]);

  const loadGestores = async () => {
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

  const handleTipoChange = (tipo: TipoDenunciado) => {
    setTipoDenunciado(tipo);
    setSelectedGestorId('');
    setSelectedGestor(null);
    setSelectedColaboradorSlackId('');
    setSelectedColaborador(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (tipoDenunciado === 'gestor' && !selectedGestorId) {
      toast.error('Selecione o gestor');
      return;
    }
    if (tipoDenunciado === 'colaborador' && !selectedColaboradorSlackId) {
      toast.error('Selecione o colaborador');
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

    setShowConfirmation(true);
  };

  const adicionarProvas = (e: React.ChangeEvent<HTMLInputElement>) => {
    const escolhidos = Array.from(e.target.files || []);
    e.target.value = '';
    const novas: File[] = [];
    let total = provas.reduce((soma, f) => soma + f.size, 0);
    for (const arquivo of escolhidos) {
      if (!provaPermitida(arquivo)) {
        toast.error(`"${arquivo.name}" não é uma foto nem um vídeo.`);
        continue;
      }
      if (arquivo.size > MAX_BYTES_POR_PROVA) {
        toast.error(`"${arquivo.name}" tem mais de 30 MB.`);
        continue;
      }
      if (provas.length + novas.length >= MAX_PROVAS_POR_DENUNCIA) {
        toast.error(`Você pode anexar no máximo ${MAX_PROVAS_POR_DENUNCIA} arquivos.`);
        break;
      }
      if (total + arquivo.size > MAX_BYTES_PROVAS_POR_DENUNCIA) {
        toast.error('As provas passam de 150 MB no total.');
        continue;
      }
      total += arquivo.size;
      novas.push(arquivo);
    }
    if (novas.length) setProvas((prev) => [...prev, ...novas]);
  };

  const atualizarEnvio = (indice: number, dados: Partial<EnvioProva>) => {
    setEnvios((prev) => prev.map((e, i) => (i === indice ? { ...e, ...dados } : e)));
  };

  // Envia um arquivo por vez. Se o servidor estiver ocupado (503), espera e tenta de novo.
  const enviarProvas = async (token: string, lista: EnvioProva[], indices: number[]) => {
    for (const i of indices) {
      atualizarEnvio(i, { status: 'enviando', progresso: 0, erro: undefined });
      let tentativas = 0;
      while (true) {
        try {
          await provasDenunciaAPI.enviar(token, lista[i].arquivo, (progresso) => atualizarEnvio(i, { progresso }));
          atualizarEnvio(i, { status: 'enviado', progresso: 100 });
          break;
        } catch (error: any) {
          if (error.response?.status === 503 && tentativas < 5) {
            tentativas++;
            await new Promise((r) => setTimeout(r, 3000));
            continue;
          }
          atualizarEnvio(i, {
            status: 'erro',
            erro: error.response?.data?.error || 'Falha no envio. Verifique sua conexão.',
          });
          break;
        }
      }
    }
  };

  const tentarEnviarDeNovo = () => {
    if (!tokenAnexos) return;
    const indices = envios.map((e, i) => (e.status === 'erro' ? i : -1)).filter((i) => i >= 0);
    void enviarProvas(tokenAnexos, envios, indices);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmation(false);
    setSubmitting(true);

    try {
      const response = await denunciasAPI.create({
        ...(tipoDenunciado === 'gestor' ? { gestorId: selectedGestorId } : { colaboradorSlackId: selectedColaboradorSlackId }),
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
      const token: string | undefined = response.data.tokenAnexos;
      // Sem token não há como enviar: as provas aparecem como não enviadas em vez de "aguardando" para sempre
      const lista: EnvioProva[] = provas.map((arquivo) =>
        token
          ? { arquivo, status: 'aguardando', progresso: 0 }
          : { arquivo, status: 'erro', progresso: 0, erro: 'Não foi possível enviar as provas desta denúncia.' }
      );
      setEnvios(lista);
      setTokenAnexos(token || null);
      setCodigoProtocolo(response.data.codigoProtocolo);
      if (lista.length && token) {
        void enviarProvas(token, lista, lista.map((_, i) => i));
      }
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

  const colaboradorOptions = [
    { value: '', label: 'Selecione o colaborador' },
    ...colaboradores.map((c) => ({
      value: c.slackId,
      label: c.nome,
    })),
  ];

  const denunciadoNome = tipoDenunciado === 'gestor'
    ? selectedGestor?.user?.nome
    : selectedColaborador?.nome;

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
          <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-neutral-100 mb-2">Denúncia Registrada!</h1>
          <p className="text-neutral-600 dark:text-neutral-300 mb-8">
            O RH foi notificado e irá analisar sua manifestação com sigilo.
          </p>

          <div className="bg-white dark:bg-neutral-800 border-3 border-neutral-900 dark:border-neutral-100 p-8 shadow-brutal mb-6">
            <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400 uppercase mb-3">Seu Código de Protocolo</p>
            <div className="text-5xl font-black tracking-[0.3em] text-neutral-900 dark:text-neutral-100 mb-4">
              {codigoProtocolo}
            </div>
            <button
              onClick={handleCopiar}
              className="flex items-center gap-2 mx-auto px-4 py-2 border-2 border-neutral-900 dark:border-neutral-100 dark:text-neutral-100 text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              {copiado ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copiado ? 'Copiado!' : 'Copiar código'}
            </button>
          </div>

          {envios.length > 0 && (
            <div className="bg-white dark:bg-neutral-800 border-3 border-neutral-900 dark:border-neutral-100 p-4 mb-6 text-left">
              <p className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                <Paperclip className="w-4 h-4" />
                Provas
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">
                {enviandoProvas
                  ? 'Enviando suas provas. Não feche esta página até terminar.'
                  : provasComErro
                    ? 'Algumas provas não foram enviadas. Tente de novo; o prazo para enviar é de 1 hora.'
                    : 'Todas as provas foram enviadas ao RH.'}
              </p>
              <ul className="space-y-2">
                {envios.map((envio, i) => (
                  <li key={i} className="text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      {envio.status === 'enviado' && <CheckCheck className="w-4 h-4 shrink-0 text-green-600" />}
                      {envio.status === 'enviando' && <Loader2 className="w-4 h-4 shrink-0 animate-spin text-neutral-500" />}
                      {envio.status === 'aguardando' && <Clock className="w-4 h-4 shrink-0 text-neutral-400" />}
                      {envio.status === 'erro' && <XCircle className="w-4 h-4 shrink-0 text-red-600" />}
                      <span className="truncate flex-1 text-neutral-800 dark:text-neutral-100">{envio.arquivo.name}</span>
                      <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{formatarTamanho(envio.arquivo.size)}</span>
                    </div>
                    {envio.status === 'enviando' && (
                      <div className="h-1.5 mt-1 bg-neutral-200 dark:bg-neutral-700">
                        <div className="h-full bg-primary-500 transition-all" style={{ width: `${envio.progresso}%` }} />
                      </div>
                    )}
                    {envio.status === 'erro' && <p className="text-xs text-red-600 mt-0.5">{envio.erro}</p>}
                  </li>
                ))}
              </ul>
              {!enviandoProvas && provasComErro > 0 && tokenAnexos && (
                <button
                  onClick={tentarEnviarDeNovo}
                  className="mt-3 px-4 py-2 text-sm font-semibold border-2 border-neutral-900 dark:border-neutral-100 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  Tentar enviar de novo
                </button>
              )}
            </div>
          )}

          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 text-left mb-6">
            <p className="font-bold text-yellow-800 dark:text-yellow-300 mb-1">⚠️ Guarde este código!</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Este código é a única forma de consultar o andamento da sua denúncia e os comentários do RH.
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
              className="px-6 py-3 font-bold border-2 border-neutral-900 dark:border-neutral-100 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
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
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-neutral-800 border-3 border-neutral-900 dark:border-neutral-100 shadow-brutal-lg p-5 sm:p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-7 h-7 text-red-500 shrink-0" />
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Confirmar envio?</h2>
            </div>
            <p className="text-neutral-600 dark:text-neutral-300 mb-2">
              Você está registrando uma denúncia{' '}
              <strong className="text-neutral-900 dark:text-neutral-100">{anonima ? 'anônima' : 'identificada'}</strong>{' '}
              contra <strong className="text-neutral-900 dark:text-neutral-100">{denunciadoNome}</strong>.
            </p>
            {provas.length > 0 && (
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">
                {provas.length === 1 ? '1 prova será enviada' : `${provas.length} provas serão enviadas`} logo em seguida.
              </p>
            )}
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
                className="flex-1 py-2.5 font-semibold bg-red-500 text-white border-2 border-neutral-900 hover:bg-red-600 transition-colors"
              >
                Confirmar Envio
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-400 border-3 border-neutral-900 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-neutral-900 dark:text-neutral-100">Ouvidoria</h1>
          </div>
          <p className="text-neutral-600 dark:text-neutral-300">
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
                {/* Toggle Gestor / Colaborador */}
                <div className="flex gap-2 p-1 bg-neutral-100 dark:bg-neutral-700 border-2 border-neutral-200 dark:border-neutral-600">
                  <button
                    type="button"
                    onClick={() => handleTipoChange('gestor')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 font-semibold text-sm transition-colors ${
                      tipoDenunciado === 'gestor'
                        ? 'bg-white dark:bg-neutral-600 border-2 border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    Denunciar Gestor
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTipoChange('colaborador')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 font-semibold text-sm transition-colors ${
                      tipoDenunciado === 'colaborador'
                        ? 'bg-white dark:bg-neutral-600 border-2 border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Denunciar Colaborador
                  </button>
                </div>

                {/* Seleção do Denunciado */}
                {tipoDenunciado === 'gestor' ? (
                  <div>
                    <Select
                      label="Gestor Denunciado"
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
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <Select
                      label="Colaborador Denunciado"
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

                <Select
                  label="Tipo de manifestação"
                  options={tiposManifestacao}
                  value={tipoManifestacao}
                  onChange={(e) => setTipoManifestacao(e.target.value)}
                />

                <div>
                  <p className="font-bold text-neutral-900 dark:text-neutral-100 mb-2">Temas abordados</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">
                    Selecione o(s) tema(s) relacionado(s) à sua manifestação:
                  </p>
                  <div className="space-y-2">
                    {temasOptions.map((t) => {
                      const checked = temas.includes(t);
                      return (
                        <label
                          key={t}
                          className="flex items-start gap-3 p-3 bg-white dark:bg-neutral-700 border-2 border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-400 transition-colors cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={checked}
                            onChange={() => {
                              setTemas((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
                            }}
                          />
                          <span className="text-sm text-neutral-800 dark:text-neutral-100">{t}</span>
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
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
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
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Sempre que possível, informe fatos, datas, locais, envolvidos (nomes ou cargos) e impactos.
                  </p>
                </div>

                {/* Provas */}
                <div>
                  <p className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-2 uppercase tracking-wide">
                    Provas (opcional)
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                    Anexe fotos ou vídeos que ajudem a entender o ocorrido: até {MAX_PROVAS_POR_DENUNCIA} arquivos de até 30 MB
                    cada. Fotos e vídeos podem guardar dados como local e modelo do celular; para manter o anonimato,
                    prefira capturas de tela.
                  </p>
                  <input
                    id="provas-input"
                    type="file"
                    multiple
                    accept={ACCEPT_PROVAS}
                    className="hidden"
                    onChange={adicionarProvas}
                  />
                  {provas.length < MAX_PROVAS_POR_DENUNCIA && (
                    <label
                      htmlFor="provas-input"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border-2 border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 cursor-pointer"
                    >
                      <Paperclip className="w-4 h-4" />
                      Adicionar fotos ou vídeos
                    </label>
                  )}
                  {provas.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {provas.map((arquivo, i) => (
                        <li
                          key={`${arquivo.name}-${i}`}
                          className="flex items-center gap-2 px-2 py-1.5 text-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 min-w-0"
                        >
                          <Paperclip className="w-4 h-4 shrink-0 text-neutral-500" />
                          <span className="truncate flex-1 text-neutral-800 dark:text-neutral-100">{arquivo.name}</span>
                          <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{formatarTamanho(arquivo.size)}</span>
                          <button
                            type="button"
                            onClick={() => setProvas((prev) => prev.filter((_, j) => j !== i))}
                            className="shrink-0 p-0.5 text-neutral-500 hover:text-red-600"
                            aria-label={`Remover ${arquivo.name}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
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

                <div className="p-4 bg-neutral-50 dark:bg-neutral-700 border-2 border-neutral-200 dark:border-neutral-600">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={declaracao}
                      onChange={(e) => setDeclaracao(e.target.checked)}
                    />
                    <span className="text-sm text-neutral-800 dark:text-neutral-100">
                      Declaro que as informações prestadas são verdadeiras, de acordo com meu conhecimento, e estou ciente
                      de que este canal deve ser utilizado de forma ética e responsável.
                    </span>
                  </label>
                </div>

                {/* Anonimato */}
                <div className="p-4 bg-neutral-100 dark:bg-neutral-700 border-2 border-neutral-300 dark:border-neutral-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {anonima ? (
                        <EyeOff className="w-6 h-6 text-neutral-600 dark:text-neutral-300" />
                      ) : (
                        <Eye className="w-6 h-6 text-neutral-600 dark:text-neutral-300" />
                      )}
                      <div>
                        <p className="font-bold text-neutral-900 dark:text-neutral-100">
                          {anonima ? 'Denúncia Anônima' : 'Denúncia Identificada'}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-300">
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
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 space-y-4">
                    <p className="font-bold text-blue-900 dark:text-blue-300">Sua identificação</p>
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
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700">
                  <div className="flex items-start gap-3">
                    <Shield className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-yellow-800 dark:text-yellow-300">Confidencialidade Garantida</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                        Esta denúncia será tratada com total sigilo pelo departamento de RH.
                        O gestor denunciado não será notificado. Apenas a equipe de RH terá
                        acesso aos detalhes da manifestação.
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
