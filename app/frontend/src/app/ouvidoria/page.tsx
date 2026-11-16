'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { AlertTriangle, Shield, Eye, EyeOff, Send, Copy, CheckCheck, CheckCircle2, Paperclip, X, Loader2, XCircle, Clock, UserPlus, Trash2 } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { denunciasAPI, provasDenunciaAPI } from '@/lib/api';
import {
  ACCEPT_PROVAS,
  MAX_BYTES_POR_PROVA,
  MAX_BYTES_PROVAS_POR_DENUNCIA,
  MAX_PROVAS_POR_DENUNCIA,
  formatarTamanho,
  provaPermitida,
} from '@/lib/provas';
import {
  CATEGORIA_OUTRO,
  MAX_PESSOAS_DENUNCIADAS,
  ORIENTACAO_DESCRICAO,
  TERMO_CIENCIA,
  categoriasOptions,
  comunicadaOptions,
  frequenciaOptions,
  impactoOptions,
  retornoOptions,
  simNaoNaoSeiOptions,
  tiposManifestacaoOptions,
  type Opcao,
} from '@/lib/denuncia';

type EnvioProva = {
  arquivo: File;
  status: 'aguardando' | 'enviando' | 'enviado' | 'erro';
  progresso: number;
  erro?: string;
};

type Pessoa = {
  nome: string;
  naoSabeNome: boolean;
  cargo: string;
  setor: string;
};

const pessoaVazia = (): Pessoa => ({ nome: '', naoSabeNome: false, cargo: '', setor: '' });

const comSelecione = (opcoes: Opcao[], texto = 'Selecione'): Opcao[] => [{ value: '', label: texto }, ...opcoes];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const telefoneValido = (v: string) => /^[\d\s()+.-]+$/.test(v) && v.replace(/\D/g, '').length >= 8;

export default function OuvidoriaPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([pessoaVazia()]);
  const [tipoManifestacao, setTipoManifestacao] = useState('');
  const [temas, setTemas] = useState<string[]>([]);
  const [temaOutro, setTemaOutro] = useState('');
  const [local, setLocal] = useState('');
  const [dataFatos, setDataFatos] = useState('');
  const [descricao, setDescricao] = useState('');
  const [frequencia, setFrequencia] = useState('');
  const [impacto, setImpacto] = useState('');
  const [testemunhas, setTestemunhas] = useState('');
  const [testemunhasDetalhes, setTestemunhasDetalhes] = useState('');
  const [condutaContinua, setCondutaContinua] = useState('');
  const [comunicada, setComunicada] = useState('');
  const [providenciaTomada, setProvidenciaTomada] = useState('');
  const [desejaRetorno, setDesejaRetorno] = useState('');
  const [declaracao, setDeclaracao] = useState(false);
  const [anonima, setAnonima] = useState(true);
  const [nomeIdentificado, setNomeIdentificado] = useState('');
  const [setorIdentificado, setSetorIdentificado] = useState('');
  const [emailIdentificado, setEmailIdentificado] = useState('');
  const [telefoneIdentificado, setTelefoneIdentificado] = useState('');
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

  const atualizarPessoa = (indice: number, dados: Partial<Pessoa>) => {
    setPessoas((prev) => prev.map((p, i) => (i === indice ? { ...p, ...dados } : p)));
  };

  const adicionarPessoa = () => {
    setPessoas((prev) => (prev.length >= MAX_PESSOAS_DENUNCIADAS ? prev : [...prev, pessoaVazia()]));
  };

  const removerPessoa = (indice: number) => {
    setPessoas((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== indice)));
  };

  const outroSelecionado = temas.includes(CATEGORIA_OUTRO);
  const temTestemunhas = testemunhas === 'SIM';
  const foiComunicada = !!comunicada && comunicada !== 'NAO';

  // Mesmas regras do servidor; devolve a primeira mensagem de erro ou null
  const validar = (): string | null => {
    if (!tipoManifestacao) return 'Selecione o tipo de manifestação';
    for (let i = 0; i < pessoas.length; i++) {
      const p = pessoas[i];
      const mensagem = (texto: string) =>
        pessoas.length > 1 ? `Pessoa ${i + 1}: ${texto}` : texto.charAt(0).toUpperCase() + texto.slice(1);
      if (!p.naoSabeNome && p.nome.trim().length < 2) return mensagem('informe o nome ou marque "Não sei o nome"');
      if (p.naoSabeNome && !p.cargo.trim() && !p.setor.trim()) return mensagem('sem o nome, informe ao menos o cargo ou o setor');
    }
    if (temas.length === 0) return 'Selecione ao menos uma categoria';
    if (outroSelecionado && temaOutro.trim().length < 3) return 'Descreva a categoria "Outro"';
    if (local.trim().length < 2) return 'Informe o local dos fatos';
    if (dataFatos.trim().length < 2) return 'Informe a data ou o período dos fatos';
    if (descricao.trim().length < 10) return 'A descrição deve ter pelo menos 10 caracteres';
    if (!frequencia) return 'Informe com que frequência a situação ocorreu';
    if (!impacto) return 'Selecione o impacto da situação';
    if (!testemunhas) return 'Informe se há testemunhas';
    if (temTestemunhas && testemunhasDetalhes.trim().length < 3) return 'Informe o nome das testemunhas ou como encontrá-las';
    if (!condutaContinua) return 'Informe se a conduta ainda está acontecendo';
    if (!comunicada) return 'Informe se a situação já foi comunicada a alguém da empresa';
    if (foiComunicada && providenciaTomada.trim().length < 2) return 'Informe qual providência foi tomada';
    if (!desejaRetorno) return 'Informe se deseja receber retorno';
    if (!anonima) {
      if (emailIdentificado.trim() && !EMAIL_RE.test(emailIdentificado.trim())) return 'E-mail inválido';
      if (telefoneIdentificado.trim() && !telefoneValido(telefoneIdentificado.trim())) return 'Telefone inválido';
    }
    if (!declaracao) return 'Você precisa ler e aceitar o termo de ciência';
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const erro = validar();
    if (erro) {
      toast.error(erro);
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
        denunciados: pessoas.map((p) => ({
          nome: p.naoSabeNome ? '' : p.nome.trim(),
          naoSabeNome: p.naoSabeNome,
          cargo: p.cargo.trim(),
          setor: p.setor.trim(),
        })),
        tipoManifestacao,
        temas,
        temaOutro: outroSelecionado ? temaOutro.trim() : '',
        local: local.trim(),
        dataFatos: dataFatos.trim(),
        descricao: descricao.trim(),
        frequencia,
        impacto,
        testemunhas,
        testemunhasDetalhes: temTestemunhas ? testemunhasDetalhes.trim() : '',
        condutaContinua,
        comunicada,
        providenciaTomada: foiComunicada ? providenciaTomada.trim() : '',
        desejaRetorno,
        declaracao,
        anonima,
        ...(!anonima && {
          nomeIdentificado: nomeIdentificado.trim(),
          setorIdentificado: setorIdentificado.trim(),
          emailIdentificado: emailIdentificado.trim(),
          telefoneIdentificado: telefoneIdentificado.trim(),
        }),
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

  const resumoPessoas = pessoas
    .map((p) => (!p.naoSabeNome && p.nome.trim() ? p.nome.trim() : [p.cargo, p.setor].map((x) => x.trim()).filter(Boolean).join(', ') || 'pessoa não identificada'))
    .join('; ');

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
              Você está registrando uma manifestação{' '}
              <strong className="text-neutral-900 dark:text-neutral-100">{anonima ? 'anônima' : 'identificada'}</strong>{' '}
              envolvendo <strong className="text-neutral-900 dark:text-neutral-100 break-words">{resumoPessoas}</strong>.
            </p>
            {provas.length > 0 && (
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">
                {provas.length === 1 ? '1 prova será enviada' : `${provas.length} provas serão enviadas`} logo em seguida.
              </p>
            )}
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Depois de enviada, a manifestação não pode ser alterada.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 py-2.5 font-semibold border-2 border-neutral-900 dark:border-neutral-100 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                Voltar e revisar
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="flex-1 py-2.5 font-semibold bg-red-500 text-white border-2 border-neutral-900 hover:bg-red-600 transition-colors"
              >
                Confirmar envio
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
            Registre sua manifestação de forma confidencial. Todas as informações são tratadas com sigilo.
            Os campos marcados com * são obrigatórios.
          </p>
        </div>

        <Card>
          <CardTitle className="flex items-center gap-2 mb-6">
            <Shield className="w-6 h-6 text-red-500" />
            Registrar Denúncia
          </CardTitle>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <Select
                label="Tipo de manifestação *"
                options={comSelecione(tiposManifestacaoOptions, 'Selecione o tipo')}
                value={tipoManifestacao}
                onChange={(e) => setTipoManifestacao(e.target.value)}
              />

              {/* Pessoas envolvidas */}
              <div>
                <p className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1 uppercase tracking-wide">
                  Pessoa(s) envolvida(s) *
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">
                  Informe quem praticou ou participou da situação. Se não souber o nome, marque &quot;Não sei o nome&quot; e
                  informe o cargo ou o setor.
                </p>
                <div className="space-y-3">
                  {pessoas.map((pessoa, i) => (
                    <div
                      key={i}
                      className="p-3 sm:p-4 bg-neutral-50 dark:bg-neutral-700/50 border-2 border-neutral-200 dark:border-neutral-600 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-neutral-700 dark:text-neutral-200">Pessoa {i + 1}</p>
                        {pessoas.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removerPessoa(i)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-red-600"
                            aria-label={`Remover pessoa ${i + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remover
                          </button>
                        )}
                      </div>
                      <Input
                        label="Nome"
                        name={`pessoa-${i}-nome`}
                        placeholder={pessoa.naoSabeNome ? 'Nome não informado' : 'Nome da pessoa'}
                        value={pessoa.naoSabeNome ? '' : pessoa.nome}
                        disabled={pessoa.naoSabeNome}
                        maxLength={120}
                        onChange={(e) => atualizarPessoa(i, { nome: e.target.value })}
                      />
                      <label className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-100 cursor-pointer w-fit">
                        <input
                          type="checkbox"
                          name={`pessoa-${i}-nao-sabe`}
                          checked={pessoa.naoSabeNome}
                          onChange={(e) => atualizarPessoa(i, { naoSabeNome: e.target.checked })}
                        />
                        Não sei o nome
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          label={pessoa.naoSabeNome ? 'Cargo' : 'Cargo (se souber)'}
                          name={`pessoa-${i}-cargo`}
                          placeholder="Ex.: supervisor, vendedor"
                          value={pessoa.cargo}
                          maxLength={120}
                          onChange={(e) => atualizarPessoa(i, { cargo: e.target.value })}
                        />
                        <Input
                          label={pessoa.naoSabeNome ? 'Setor' : 'Setor (se souber)'}
                          name={`pessoa-${i}-setor`}
                          placeholder="Ex.: financeiro, loja do centro"
                          value={pessoa.setor}
                          maxLength={120}
                          onChange={(e) => atualizarPessoa(i, { setor: e.target.value })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {pessoas.length < MAX_PESSOAS_DENUNCIADAS && (
                  <button
                    type="button"
                    onClick={adicionarPessoa}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border-2 border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600"
                  >
                    <UserPlus className="w-4 h-4" />
                    Adicionar outra pessoa
                  </button>
                )}
              </div>

              {/* Categorias */}
              <div>
                <p className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1 uppercase tracking-wide">
                  Categoria *
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">
                  Selecione uma ou mais categorias relacionadas à sua manifestação:
                </p>
                <div className="space-y-2">
                  {categoriasOptions.map((t) => {
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
                        <span className="text-sm text-neutral-800 dark:text-neutral-100">{t === CATEGORIA_OUTRO ? 'Outro' : t}</span>
                      </label>
                    );
                  })}
                </div>
                {outroSelecionado && (
                  <div className="mt-3">
                    <Input
                      label="Qual outra categoria? *"
                      name="tema-outro"
                      placeholder="Descreva a categoria"
                      value={temaOutro}
                      maxLength={200}
                      onChange={(e) => setTemaOutro(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Local e data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Local dos fatos *"
                  name="local"
                  placeholder="Ex.: loja do centro, sala de reuniões, grupo de WhatsApp"
                  value={local}
                  maxLength={200}
                  onChange={(e) => setLocal(e.target.value)}
                />
                <Input
                  label="Data ou período *"
                  name="data-fatos"
                  placeholder="Ex.: 10/11/2026, ou de agosto a outubro de 2026"
                  value={dataFatos}
                  maxLength={200}
                  onChange={(e) => setDataFatos(e.target.value)}
                />
              </div>

              {/* Descrição */}
              <div>
                <p className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1 uppercase tracking-wide">
                  Descrição dos fatos *
                </p>
                <ul className="text-sm text-neutral-600 dark:text-neutral-300 mb-3 list-disc pl-5 space-y-1">
                  {ORIENTACAO_DESCRICAO.map((linha) => (
                    <li key={linha}>{linha}</li>
                  ))}
                </ul>
                <Textarea
                  name="descricao"
                  placeholder="Descreva o que aconteceu..."
                  value={descricao}
                  maxLength={20000}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={8}
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Mínimo de 10 caracteres.</p>
              </div>

              {/* Provas */}
              <div>
                <p className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-2 uppercase tracking-wide">
                  Provas (opcional)
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                  Anexe fotos ou vídeos que ajudem a entender o ocorrido: até {MAX_PROVAS_POR_DENUNCIA} arquivos de até 30 MB
                  cada. Fotos e vídeos podem guardar dados como o local e o modelo do celular; para manter o anonimato,
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
                label="Com que frequência a situação ocorreu? *"
                options={comSelecione(frequenciaOptions)}
                value={frequencia}
                onChange={(e) => setFrequencia(e.target.value)}
              />

              <Select
                label="Qual o impacto dessa situação? *"
                options={comSelecione(impactoOptions)}
                value={impacto}
                onChange={(e) => setImpacto(e.target.value)}
              />

              <div className="space-y-3">
                <Select
                  label="Há testemunhas? *"
                  name="testemunhas"
                  options={comSelecione(simNaoNaoSeiOptions)}
                  value={testemunhas}
                  onChange={(e) => setTestemunhas(e.target.value)}
                />
                {temTestemunhas && (
                  <Textarea
                    label="Quem são ou como encontrá-las? *"
                    name="testemunhas-detalhes"
                    placeholder="Ex.: nomes, cargos ou setores das pessoas que presenciaram"
                    value={testemunhasDetalhes}
                    maxLength={2000}
                    onChange={(e) => setTestemunhasDetalhes(e.target.value)}
                    rows={3}
                  />
                )}
              </div>

              <Select
                label="A conduta ainda está acontecendo? *"
                name="conduta-continua"
                options={comSelecione(simNaoNaoSeiOptions)}
                value={condutaContinua}
                onChange={(e) => setCondutaContinua(e.target.value)}
              />

              <div className="space-y-3">
                <Select
                  label="A situação já foi comunicada a alguém da empresa? *"
                  name="comunicada"
                  options={comSelecione(comunicadaOptions)}
                  value={comunicada}
                  onChange={(e) => setComunicada(e.target.value)}
                />
                {foiComunicada && (
                  <Textarea
                    label="Qual providência foi tomada? *"
                    name="providencia"
                    placeholder='Ex.: "nenhuma providência até agora" ou "a pessoa foi advertida, mas a situação continuou"'
                    value={providenciaTomada}
                    maxLength={2000}
                    onChange={(e) => setProvidenciaTomada(e.target.value)}
                    rows={3}
                  />
                )}
              </div>

              <Select
                label="Deseja receber retorno sobre esta manifestação? *"
                options={comSelecione(retornoOptions)}
                value={desejaRetorno}
                onChange={(e) => setDesejaRetorno(e.target.value)}
              />

              {/* Anonimato */}
              <div className="p-4 bg-neutral-100 dark:bg-neutral-700 border-2 border-neutral-300 dark:border-neutral-500">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {anonima ? (
                      <EyeOff className="w-6 h-6 shrink-0 text-neutral-600 dark:text-neutral-300" />
                    ) : (
                      <Eye className="w-6 h-6 shrink-0 text-neutral-600 dark:text-neutral-300" />
                    )}
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-neutral-100">
                        {anonima ? 'Denúncia anônima' : 'Denúncia identificada'}
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300">
                        {anonima
                          ? 'Sua identidade não será registrada'
                          : 'Seus dados serão vistos apenas pela equipe de RH responsável'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={anonima}
                    aria-label="Denúncia anônima"
                    onClick={() => setAnonima(!anonima)}
                    className={`relative shrink-0 w-14 h-8 rounded-full transition-colors ${
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
                    name="nome-identificado"
                    placeholder="Digite seu nome completo"
                    value={nomeIdentificado}
                    maxLength={120}
                    onChange={(e) => setNomeIdentificado(e.target.value)}
                  />
                  <Input
                    label="Seu setor"
                    name="setor-identificado"
                    placeholder="Digite o setor em que você trabalha"
                    value={setorIdentificado}
                    maxLength={120}
                    onChange={(e) => setSetorIdentificado(e.target.value)}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="E-mail (opcional)"
                      name="email-identificado"
                      type="email"
                      placeholder="seu@email.com"
                      value={emailIdentificado}
                      maxLength={200}
                      onChange={(e) => setEmailIdentificado(e.target.value)}
                    />
                    <Input
                      label="Telefone (opcional)"
                      name="telefone-identificado"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={telefoneIdentificado}
                      maxLength={30}
                      onChange={(e) => setTelefoneIdentificado(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    O e-mail e o telefone servem apenas para o RH entrar em contato com você sobre esta denúncia.
                  </p>
                </div>
              )}

              {/* Termo de ciência */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-700 border-2 border-neutral-200 dark:border-neutral-600">
                <p className="font-bold text-neutral-900 dark:text-neutral-100 mb-3">Termo de ciência *</p>
                <div className="space-y-2 mb-4">
                  {TERMO_CIENCIA.map((item) => (
                    <p key={item.titulo} className="text-sm text-neutral-700 dark:text-neutral-200">
                      <strong>{item.titulo}:</strong> {item.texto}
                    </p>
                  ))}
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="declaracao"
                    className="mt-1"
                    checked={declaracao}
                    onChange={(e) => setDeclaracao(e.target.checked)}
                  />
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Li e concordo com o termo de ciência.
                  </span>
                </label>
              </div>

              {/* Aviso de Confidencialidade */}
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-yellow-800 dark:text-yellow-300">Confidencialidade garantida</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                      As pessoas citadas não são avisadas desta denúncia. Apenas a equipe de RH responsável pela apuração
                      tem acesso aos detalhes da manifestação.
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
        </Card>
      </div>
    </PublicLayout>
  );
}
