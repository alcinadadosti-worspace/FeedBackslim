// Opções, rótulos e textos do formulário de denúncia, usados também no painel do RH.

export type Opcao = { value: string; label: string };

export const MAX_PESSOAS_DENUNCIADAS = 10;
export const CATEGORIA_OUTRO = 'Outros';

export const tiposManifestacaoOptions: Opcao[] = [
  { value: 'DENUNCIA', label: 'Denúncia' },
  { value: 'RECLAMACAO', label: 'Reclamação' },
  { value: 'SUGESTAO_MELHORIA', label: 'Sugestão de melhoria' },
  { value: 'ELOGIO', label: 'Elogio' },
  { value: 'DUVIDA', label: 'Dúvida' },
  { value: 'OUTRO', label: 'Outro' },
];

export const categoriasOptions: string[] = [
  'Assédio moral',
  'Assédio sexual',
  'Discriminação (gênero, raça, idade, religião, orientação sexual, deficiência etc.)',
  'Conduta antiética ou comportamento inadequado',
  'Fraude ou irregularidade financeira',
  'Corrupção',
  'Conflito de interesses',
  'Trabalho em condições degradantes',
  'Segurança no trabalho',
  'Relacionamento com a liderança',
  'Falhas de gestão ou liderança',
  'Injustiça ou favorecimento indevido',
  'Falta de respeito no ambiente de trabalho',
  'Conflitos entre colegas',
  'Sobrecarga de trabalho ou metas excessivas',
  'Saúde mental e bem-estar',
  'Clima organizacional',
  'Comunicação interna',
  'Processos internos ineficientes',
  'Descumprimento de normas ou políticas internas',
  CATEGORIA_OUTRO,
];

export const frequenciaOptions: Opcao[] = [
  { value: 'UMA_VEZ', label: 'Uma única vez' },
  { value: 'MAIS_DE_UMA_VEZ', label: 'Mais de uma vez' },
  { value: 'FREQUENTE', label: 'Com frequência' },
];

export const impactoOptions: Opcao[] = [
  { value: 'DESEMPENHO', label: 'Afeta meu desempenho' },
  { value: 'SAUDE_MENTAL', label: 'Afeta minha saúde emocional ou mental' },
  { value: 'CLIMA_EQUIPE', label: 'Afeta o clima da equipe' },
  { value: 'RESULTADOS', label: 'Afeta os resultados da área' },
  { value: 'NAO_SEI', label: 'Não sei avaliar' },
];

export const simNaoNaoSeiOptions: Opcao[] = [
  { value: 'SIM', label: 'Sim' },
  { value: 'NAO', label: 'Não' },
  { value: 'NAO_SEI', label: 'Não sei' },
];

export const comunicadaOptions: Opcao[] = [
  { value: 'LIDERANCA', label: 'Sim, à liderança' },
  { value: 'RH', label: 'Sim, ao RH' },
  { value: 'OUTRO_CANAL', label: 'Sim, por outro canal' },
  { value: 'NAO', label: 'Não' },
];

export const retornoOptions: Opcao[] = [
  { value: 'SIM', label: 'Sim' },
  { value: 'NAO', label: 'Não' },
];

export const tipoDenunciaLabels: Record<string, string> = {
  ASSEDIO_MORAL: 'Assédio moral',
  COMPORTAMENTO_INADEQUADO: 'Comportamento inadequado',
  ABUSO_AUTORIDADE: 'Abuso de autoridade',
  FRAUDE_CORRUPCAO: 'Fraude ou corrupção',
  CONDICOES_DEGRADANTES: 'Condições degradantes',
  OUTROS: 'Outros',
};

// Pergunta "Alguém mais está envolvido?" do formulário anterior (só em denúncias antigas)
const envolvidosAntigoOptions: Opcao[] = simNaoNaoSeiOptions;

export function rotulo(opcoes: Opcao[], valor: string | null | undefined): string {
  if (!valor) return '';
  return opcoes.find((o) => o.value === valor)?.label || valor.replace(/_/g, ' ');
}

export const rotulos = {
  tipoManifestacao: (v?: string | null) => rotulo(tiposManifestacaoOptions, v),
  frequencia: (v?: string | null) => rotulo(frequenciaOptions, v),
  impacto: (v?: string | null) => rotulo(impactoOptions, v),
  simNaoNaoSei: (v?: string | null) => rotulo(simNaoNaoSeiOptions, v),
  comunicada: (v?: string | null) => rotulo(comunicadaOptions, v),
  retorno: (v?: string | null) => rotulo(retornoOptions, v),
  envolvidosAntigo: (v?: string | null) => rotulo(envolvidosAntigoOptions, v),
  tipoDenuncia: (v?: string | null) => (v ? tipoDenunciaLabels[v] || v.replace(/_/g, ' ') : ''),
};

export type PessoaDenunciada = {
  nome: string | null;
  naoSabeNome: boolean;
  cargo: string | null;
  setor: string | null;
};

/** Nome(s) para mostrar na lista: denúncias novas (campos livres) e antigas (gestor ou colaborador) */
export function nomeDosDenunciados(denuncia: any): string {
  if (Array.isArray(denuncia?.denunciados) && denuncia.denunciados.length) {
    return denuncia.denunciados
      .map((p: PessoaDenunciada) => (!p.naoSabeNome && p.nome ? p.nome : 'Nome não informado'))
      .join(', ');
  }
  return denuncia?.gestor?.user?.nome || denuncia?.colaboradorNome || 'Desconhecido';
}

export const ORIENTACAO_DESCRICAO = [
  'Conte o que aconteceu com o máximo de detalhes: o que foi feito ou dito, por quem, com quem, como aconteceu e quais foram as consequências.',
  'Relate apenas fatos que você presenciou ou de que tem conhecimento, sem suposições. Se souber, informe valores, documentos ou outras provas.',
  'Para sugestões, elogios ou dúvidas, descreva o assunto com clareza.',
];

// Termo de ciência do formulário, no texto do modelo do RH (um item por parágrafo).
// Ao mudar o texto, aumente VERSAO_TERMO_CIENCIA no backend (denuncia.routes.ts)
// para saber qual versão cada denunciante aceitou.
export const TERMO_CIENCIA: string[] = [
  'Declaro que as informações prestadas são verdadeiras e que tenho ciência de que denúncias comprovadamente falsas e de má-fé podem ensejar responsabilização nos termos da legislação vigente e das normas internas da empresa.',
  'Declaro ainda que estou ciente de que esta denúncia será tratada com sigilo e apurada pelo Comitê de Ética/Compliance da empresa, quando preenchidos os requisitos para sua investigação.',
];
