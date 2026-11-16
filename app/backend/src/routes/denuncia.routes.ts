import { Router, Response } from 'express';
import { randomInt } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { authenticateToken, AuthRequest, requireAdmin } from '../middleware/auth.middleware';
import { denunciaLimiter, consultaProtocoloLimiter } from '../middleware/rateLimit.middleware';
import { sendComplaintNotification } from '../services/slack.service';
import { StatusDenuncia, TipoDenuncia } from '../models';
import { col, docRef, getManyByIds, normalizeFirestoreData, snapData } from '../firestoreRepo';
import { findColaboradorBySlackId } from '../colaboradorRepo';
import {
  historicoParaDenunciante,
  historicoParaRH,
  listarHistorico,
  MAX_CARACTERES_COMENTARIO,
  registrarNoHistorico
} from '../services/denunciaHistorico.service';
import { gerarTokenProvas } from '../services/denunciaProvas.service';
import denunciaProvasRoutes from './denunciaProvas.routes';
import { semDenunciasContraOUsuario, usuarioEhDenunciado } from '../services/conflitoInteresse';
import { nomesDosDenunciados, PessoaDenunciada, resumoDosDenunciados } from '../services/nomes';

const router = Router();

// Provas (fotos e vídeos) enviadas ao registrar a denúncia: /anexos e /:id/anexos
router.use(denunciaProvasRoutes);

const statusLabels: Record<StatusDenuncia, string> = {
  [StatusDenuncia.PENDENTE]: 'Pendente',
  [StatusDenuncia.EM_ANALISE]: 'Em análise',
  [StatusDenuncia.RESOLVIDA]: 'Resolvida',
  [StatusDenuncia.ARQUIVADA]: 'Arquivada'
};

const tipoManifestacaoSchema = z.enum(['DENUNCIA', 'RECLAMACAO', 'SUGESTAO_MELHORIA', 'ELOGIO', 'DUVIDA', 'OUTRO']);
const frequenciaSchema = z.enum(['UMA_VEZ', 'MAIS_DE_UMA_VEZ', 'FREQUENTE']);
const impactoSchema = z.enum(['DESEMPENHO', 'SAUDE_MENTAL', 'CLIMA_EQUIPE', 'RESULTADOS', 'NAO_SEI']);
const comunicadaSchema = z.enum(['LIDERANCA', 'RH', 'OUTRO_CANAL', 'NAO']);
const simNaoNaoSeiSchema = z.enum(['SIM', 'NAO', 'NAO_SEI']);

const MAX_PESSOAS_DENUNCIADAS = 10;
const TEMA_OUTROS = 'Outros';
// Versão do termo de ciência aceito no formulário (o texto fica no frontend, em lib/denuncia.ts).
// A versão 1 é o termo curto do formulário anterior.
const VERSAO_TERMO_CIENCIA = 2;

const textoLivre = (max: number, mensagem: string) => z.string().trim().max(max, mensagem).optional().default('');

const pessoaDenunciadaSchema = z.object({
  nome: textoLivre(120, 'O nome pode ter no máximo 120 caracteres'),
  naoSabeNome: z.boolean().optional().default(false),
  cargo: textoLivre(120, 'O cargo pode ter no máximo 120 caracteres'),
  setor: textoLivre(120, 'O setor pode ter no máximo 120 caracteres')
});

// Formulário atual: pessoas citadas em campos livres (nome, cargo e setor)
const novaDenunciaSchema = z.object({
  denunciados: z
    .array(pessoaDenunciadaSchema)
    .min(1, 'Informe quem está envolvido na situação')
    .max(MAX_PESSOAS_DENUNCIADAS, `Informe no máximo ${MAX_PESSOAS_DENUNCIADAS} pessoas`),
  tipoManifestacao: tipoManifestacaoSchema,
  temas: z.array(z.string().trim().min(1).max(200)).min(1, 'Selecione ao menos uma categoria').max(30),
  temaOutro: textoLivre(200, 'A categoria "Outro" pode ter no máximo 200 caracteres'),
  local: z.string().trim().min(2, 'Informe o local dos fatos').max(200, 'O local pode ter no máximo 200 caracteres'),
  dataFatos: z.string().trim().min(2, 'Informe a data ou o período dos fatos').max(200, 'A data ou período pode ter no máximo 200 caracteres'),
  descricao: z.string().trim().min(10, 'A descrição deve ter no mínimo 10 caracteres').max(20000, 'A descrição pode ter no máximo 20.000 caracteres'),
  frequencia: frequenciaSchema,
  impacto: impactoSchema,
  testemunhas: simNaoNaoSeiSchema,
  testemunhasDetalhes: textoLivre(2000, 'As informações sobre testemunhas podem ter no máximo 2.000 caracteres'),
  condutaContinua: simNaoNaoSeiSchema,
  comunicada: comunicadaSchema,
  providenciaTomada: textoLivre(2000, 'A providência tomada pode ter no máximo 2.000 caracteres'),
  desejaRetorno: z.enum(['SIM', 'NAO']),
  declaracao: z.boolean().refine((v) => v === true, 'É preciso aceitar o termo de ciência'),
  anonima: z.boolean().default(true),
  nomeIdentificado: textoLivre(120, 'O nome pode ter no máximo 120 caracteres'),
  setorIdentificado: textoLivre(120, 'O setor pode ter no máximo 120 caracteres'),
  emailIdentificado: textoLivre(200, 'E-mail muito longo').refine((v) => !v || z.string().email().safeParse(v).success, 'E-mail inválido'),
  telefoneIdentificado: textoLivre(30, 'Telefone inválido').refine(
    (v) => !v || (/^[\d\s()+.-]+$/.test(v) && v.replace(/\D/g, '').length >= 8),
    'Telefone inválido'
  )
}).superRefine((data, ctx) => {
  const varias = data.denunciados.length > 1;
  data.denunciados.forEach((p, i) => {
    const mensagem = (texto: string) => (varias ? `Pessoa ${i + 1}: ${texto}` : texto.charAt(0).toUpperCase() + texto.slice(1));
    if (!p.naoSabeNome && p.nome.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['denunciados', i, 'nome'], message: mensagem('informe o nome ou marque "Não sei o nome"') });
    }
    if (p.naoSabeNome && !p.cargo && !p.setor) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['denunciados', i, 'cargo'], message: mensagem('sem o nome, informe ao menos o cargo ou o setor') });
    }
  });
  if (data.temas.includes(TEMA_OUTROS) && data.temaOutro.length < 3) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['temaOutro'], message: 'Descreva a categoria "Outro"' });
  }
  if (data.testemunhas === 'SIM' && data.testemunhasDetalhes.length < 3) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['testemunhasDetalhes'], message: 'Informe o nome das testemunhas ou como encontrá-las' });
  }
  if (data.comunicada !== 'NAO' && data.providenciaTomada.length < 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['providenciaTomada'], message: 'Informe qual providência foi tomada' });
  }
});

// Formulário anterior (pessoa escolhida numa lista). Continua aceito para quem estava com a
// página aberta antes da atualização não perder o que escreveu.
const denunciaFormatoAntigoSchema = z.object({
  gestorId: z.string().uuid('ID do gestor inválido').optional(),
  colaboradorSlackId: z.string().optional(),
  tipoManifestacao: z.enum(['DENUNCIA', 'RECLAMACAO', 'SUGESTAO_MELHORIA', 'ELOGIO', 'DUVIDA', 'OUTRO']),
  temas: z.array(z.string().min(1)).min(1, 'Selecione ao menos um tema'),
  descricao: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  descricaoComplementar: z.string().min(10, 'Descrição complementar deve ter no mínimo 10 caracteres'),
  frequencia: z.enum(['UMA_VEZ', 'MAIS_DE_UMA_VEZ', 'FREQUENTE']),
  impacto: z.enum(['DESEMPENHO', 'SAUDE_MENTAL', 'CLIMA_EQUIPE', 'RESULTADOS', 'NAO_SEI']),
  envolvidos: z.enum(['SIM', 'NAO', 'NAO_SEI']),
  comunicada: z.enum(['LIDERANCA', 'RH', 'OUTRO_CANAL', 'NAO']),
  desejaRetorno: z.enum(['SIM', 'NAO']),
  declaracao: z.boolean().refine((v) => v === true, 'Declaração final é obrigatória'),
  anonima: z.boolean().default(true),
  nomeIdentificado: z.string().optional(),
  setorIdentificado: z.string().optional()
}).superRefine((data, ctx) => {
  if (!data.gestorId && !data.colaboradorSlackId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Selecione um gestor ou colaborador',
      path: ['gestorId']
    });
  }
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(StatusDenuncia),
  comentarioRH: z.string().optional()
});

async function gerarCodigoProtocolo(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const codigo = randomInt(100000, 1000000).toString();
    const snap = await col('denuncias').where('codigoProtocolo', '==', codigo).limit(1).get();
    if (snap.empty) return codigo;
  }
  // Fallback com timestamp se todas as tentativas colidirem (praticamente impossível)
  return `${randomInt(100000, 1000000)}${Date.now().toString(36)}`;
}

// Listar denúncias (apenas admin)
// Filtra só por igualdade e ordena/pagina em memória: assim nenhuma combinação de filtros
// depende de índice composto no Firestore (o volume de denúncias é pequeno).
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { gestorId, status, tipo } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const take = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * take;

    let query: any = col('denuncias');
    if (gestorId) query = query.where('gestorId', '==', gestorId);
    if (status) query = query.where('status', '==', status);
    if (tipo) query = query.where('tipo', '==', tipo);

    const todasSnap = await query.get();
    const todas = (await semDenunciasContraOUsuario(
      req.user!.id,
      todasSnap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }))
    )).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = todas.length;
    const denuncias = todas.slice(skip, skip + take);

    const gestorIds = denuncias.map((d: any) => d.gestorId).filter(Boolean);
    const autorIds = denuncias.map((d: any) => d.autorId).filter(Boolean);
    const gestoresById = await getManyByIds<any>('gestores', gestorIds);
    const gestorUserIds = Object.values(gestoresById).map((g: any) => (g as any).userId).filter(Boolean);
    const usersById = await getManyByIds<any>('users', [...autorIds, ...gestorUserIds]);

    const denunciasComIncludes = denuncias.map((d: any) => {
      const gestor = gestoresById[d.gestorId];
      const gestorUser = gestor ? usersById[(gestor as any).userId] : undefined;
      const autor = d.autorId ? usersById[d.autorId] : undefined;
      return {
        ...d,
        gestor: gestor
          ? {
              ...(gestor as any),
              user: gestorUser ? { nome: (gestorUser as any).nome } : null
            }
          : null,
        autor: autor ? { nome: (autor as any).nome } : null
      };
    });

    // Ocultar autor em denúncias anônimas
    const denunciasFormatadas = denunciasComIncludes.map((d: any) => ({
      ...d,
      autor: d.anonima ? null : d.autor
    }));

    res.json({
      data: denunciasFormatadas,
      pagination: {
        page,
        limit: take,
        total,
        pages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('Erro ao listar denúncias:', error);
    res.status(500).json({ error: 'Erro ao listar denúncias' });
  }
});

// Estatísticas de denúncias (admin)
router.get('/stats', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const snap = await col('denuncias').get();
    const denuncias = await semDenunciasContraOUsuario(
      req.user!.id,
      snap.docs.map((d: any) => normalizeFirestoreData(d.data()) as any)
    );
    const total = denuncias.length;

    const porStatus = denuncias.reduce<Record<string, number>>((acc: Record<string, number>, d: any) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {});

    const porTipo = denuncias.reduce<Record<string, number>>((acc: Record<string, number>, d: any) => {
      acc[d.tipo] = (acc[d.tipo] || 0) + 1;
      return acc;
    }, {});

    res.json({
      total,
      porStatus,
      porTipo
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter estatísticas' });
  }
});

function classificarTipo(temas: string[]): TipoDenuncia {
  const has = (needle: string) => temas.some((t) => t.toLowerCase().includes(needle));
  if (has('assédio moral') || has('assedio moral')) return TipoDenuncia.ASSEDIO_MORAL;
  if (has('condições degradantes') || has('condicoes degradantes')) return TipoDenuncia.CONDICOES_DEGRADANTES;
  if (has('fraude') || has('corrupção') || has('corrupcao') || has('conflito de interesses')) return TipoDenuncia.FRAUDE_CORRUPCAO;
  if (has('falhas de gestão') || has('falhas de gestao') || has('injustiça') || has('injustica') || has('liderança') || has('lideranca')) {
    return TipoDenuncia.ABUSO_AUTORIDADE;
  }
  if (has('conduta ética') || has('conduta etica') || has('antiética') || has('antietica') || has('assédio sexual') || has('assedio sexual') || has('discriminação') || has('discriminacao') || has('comportamento inadequado') || has('falta de respeito') || has('conflitos')) {
    return TipoDenuncia.COMPORTAMENTO_INADEQUADO;
  }
  return TipoDenuncia.OUTROS;
}

class ErroDenuncia extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface DenunciaMontada {
  campos: Record<string, any>;
  tipoManifestacao: string;
  temas: string[];
  descricao: string;
  anonima: boolean;
  nomeIdentificado: string | null;
  setorIdentificado: string | null;
  local: string | null;
  dataFatos: string | null;
  denunciadoNome: string;
  denunciadoSlackId: string | null;
  nomesDenunciados: string[];
}

function montarDenunciaNova(body: unknown): DenunciaMontada {
  const data = novaDenunciaSchema.parse(body);
  const identificada = !data.anonima;
  const denunciados: PessoaDenunciada[] = data.denunciados.map((p) => ({
    nome: p.naoSabeNome ? null : p.nome,
    naoSabeNome: p.naoSabeNome,
    cargo: p.cargo || null,
    setor: p.setor || null
  }));
  const denunciadoNome = resumoDosDenunciados(denunciados);
  const nomeIdentificado = identificada ? data.nomeIdentificado || null : null;
  const setorIdentificado = identificada ? data.setorIdentificado || null : null;

  return {
    campos: {
      gestorId: null,
      colaboradorSlackId: null,
      colaboradorNome: null,
      denunciados,
      denunciadosResumo: denunciadoNome,
      tipoManifestacao: data.tipoManifestacao,
      temas: data.temas,
      temaOutro: data.temas.includes(TEMA_OUTROS) ? data.temaOutro : null,
      local: data.local,
      dataFatos: data.dataFatos,
      descricao: data.descricao,
      frequencia: data.frequencia,
      impacto: data.impacto,
      testemunhas: data.testemunhas,
      testemunhasDetalhes: data.testemunhas === 'SIM' ? data.testemunhasDetalhes : null,
      condutaContinua: data.condutaContinua,
      comunicada: data.comunicada,
      providenciaTomada: data.comunicada !== 'NAO' ? data.providenciaTomada : null,
      desejaRetorno: data.desejaRetorno,
      declaracao: data.declaracao,
      termoVersao: VERSAO_TERMO_CIENCIA,
      anonima: data.anonima,
      nomeIdentificado,
      setorIdentificado,
      emailIdentificado: identificada ? data.emailIdentificado || null : null,
      telefoneIdentificado: identificada ? data.telefoneIdentificado || null : null
    },
    tipoManifestacao: data.tipoManifestacao,
    temas: data.temas,
    descricao: data.descricao,
    anonima: data.anonima,
    nomeIdentificado,
    setorIdentificado,
    local: data.local,
    dataFatos: data.dataFatos,
    denunciadoNome,
    denunciadoSlackId: null,
    nomesDenunciados: nomesDosDenunciados({ denunciados })
  };
}

async function montarDenunciaFormatoAntigo(body: unknown): Promise<DenunciaMontada> {
  const data = denunciaFormatoAntigoSchema.parse(body);

  let denunciadoNome = '';
  let denunciadoSlackId: string | null = null;

  if (data.gestorId) {
    const gestorSnap = await docRef('gestores', data.gestorId).get();
    const gestor = snapData<any>(gestorSnap as any);
    if (!gestor) throw new ErroDenuncia(404, 'Gestor não encontrado');
    const gestorUserSnap = await docRef('users', gestor.userId).get();
    const gestorUser = snapData<any>(gestorUserSnap as any);
    denunciadoNome = gestorUser?.nome || 'Gestor';
    denunciadoSlackId = gestor.slackUserId ?? null;
  } else if (data.colaboradorSlackId) {
    const colaborador = await findColaboradorBySlackId(data.colaboradorSlackId);
    if (!colaborador) throw new ErroDenuncia(404, 'Colaborador não encontrado');
    denunciadoNome = colaborador.nome;
    denunciadoSlackId = colaborador.slackId;
  }

  const nomeIdentificado = !data.anonima ? data.nomeIdentificado || null : null;
  const setorIdentificado = !data.anonima ? data.setorIdentificado || null : null;

  return {
    campos: {
      gestorId: data.gestorId || null,
      colaboradorSlackId: data.colaboradorSlackId || null,
      colaboradorNome: data.colaboradorSlackId ? denunciadoNome : null,
      tipoManifestacao: data.tipoManifestacao,
      temas: data.temas,
      descricao: data.descricao,
      descricaoComplementar: data.descricaoComplementar,
      frequencia: data.frequencia,
      impacto: data.impacto,
      envolvidos: data.envolvidos,
      comunicada: data.comunicada,
      desejaRetorno: data.desejaRetorno,
      declaracao: data.declaracao,
      anonima: data.anonima,
      nomeIdentificado,
      setorIdentificado
    },
    tipoManifestacao: data.tipoManifestacao,
    temas: data.temas,
    descricao: data.descricao,
    anonima: data.anonima,
    nomeIdentificado,
    setorIdentificado,
    local: null,
    dataFatos: null,
    denunciadoNome,
    denunciadoSlackId,
    nomesDenunciados: []
  };
}

// Criar denúncia (anônima - não requer autenticação)
router.post('/', denunciaLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const montada = Array.isArray(req.body?.denunciados)
      ? montarDenunciaNova(req.body)
      : await montarDenunciaFormatoAntigo(req.body);

    // Criar denúncia anônima (sem autorId)
    const now = new Date();
    const denunciaId = uuidv4();
    const codigoProtocolo = await gerarCodigoProtocolo();
    const tipo = classificarTipo(montada.temas);

    await docRef('denuncias', denunciaId).set({
      id: denunciaId,
      autorId: null,
      tipo,
      ...montada.campos,
      codigoProtocolo,
      comentarioRH: null,
      status: StatusDenuncia.PENDENTE,
      createdAt: now,
      updatedAt: now
    });

    // Enviar notificações Slack
    try {
      await sendComplaintNotification({
        denunciadoNome: montada.denunciadoNome,
        denunciadoSlackId: montada.denunciadoSlackId,
        nomesDenunciados: montada.nomesDenunciados,
        tipo,
        tipoManifestacao: montada.tipoManifestacao,
        temas: montada.temas,
        descricao: montada.descricao,
        local: montada.local,
        dataFatos: montada.dataFatos,
        denunciaId: denunciaId,
        anonima: montada.anonima,
        nomeIdentificado: montada.nomeIdentificado || undefined,
        setorIdentificado: montada.setorIdentificado || undefined
      });
    } catch (slackError) {
      console.error('Erro ao enviar notificação Slack:', slackError);
    }

    res.status(201).json({
      id: denunciaId,
      tipo,
      tipoManifestacao: montada.tipoManifestacao,
      status: StatusDenuncia.PENDENTE,
      codigoProtocolo,
      createdAt: now,
      // Permite anexar fotos e vídeos a esta denúncia na próxima 1 hora
      tokenAnexos: gerarTokenProvas(denunciaId),
      message: 'Denúncia registrada com sucesso. O RH será notificado.'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error instanceof ErroDenuncia) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar denúncia' });
  }
});

// Atualizar status da denúncia (apenas admin)
router.patch('/:id/status', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = updateStatusSchema.parse(req.body);

    const ref = docRef('denuncias', req.params.id);
    const atual = await ref.get();
    if (!atual.exists || (await usuarioEhDenunciado(req.user!.id, atual.data() as any))) {
      return res.status(404).json({ error: 'Denúncia não encontrada' });
    }
    const statusAnterior = atual.get('status');

    const now = new Date();
    const updateData: any = { status: data.status, updatedAt: now };
    await ref.set(updateData, { merge: true });

    // Mudança de status e comentário vão para o histórico, que o denunciante vê pelo protocolo
    try {
      if (statusAnterior !== data.status) {
        await registrarNoHistorico(req.params.id, {
          tipo: 'STATUS',
          texto: `Status alterado para "${statusLabels[data.status]}".`,
          autorUserId: req.user!.id
        });
      }
      const comentario = data.comentarioRH?.trim();
      if (comentario) {
        await registrarNoHistorico(req.params.id, { tipo: 'COMENTARIO', texto: comentario, autorUserId: req.user!.id });
      }
    } catch (historicoError) {
      console.error('Erro ao registrar no histórico da denúncia:', historicoError);
    }

    res.json({ id: req.params.id, ...updateData });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// Consultar denúncia por código de protocolo (público - sem autenticação)
router.get('/consultar/:codigo', consultaProtocoloLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { codigo } = req.params;
    const snap = await col('denuncias').where('codigoProtocolo', '==', codigo).limit(1).get();
    if (snap.empty) {
      return res.status(404).json({ error: 'Código de protocolo não encontrado' });
    }
    const denuncia = normalizeFirestoreData(snap.docs[0].data()) as any;
    const historico = await listarHistorico(snap.docs[0].id);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      codigoProtocolo: denuncia.codigoProtocolo,
      status: denuncia.status,
      tipoManifestacao: denuncia.tipoManifestacao,
      // Comentário único da época antes do histórico existir
      comentarioRH: denuncia.comentarioRH || null,
      historico: historico.map(historicoParaDenunciante),
      quantidadeProvas: Number(denuncia.anexosCount || 0),
      createdAt: denuncia.createdAt,
      updatedAt: denuncia.updatedAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao consultar denúncia' });
  }
});

// Histórico da denúncia (admin)
router.get('/:id/historico', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const snap = await docRef('denuncias', req.params.id).get();
    if (!snap.exists || (await usuarioEhDenunciado(req.user!.id, snap.data() as any))) {
      return res.status(404).json({ error: 'Denúncia não encontrada' });
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ data: (await listarHistorico(req.params.id)).map(historicoParaRH) });
  } catch (error) {
    console.error('Erro ao obter histórico:', error);
    res.status(500).json({ error: 'Erro ao obter histórico' });
  }
});

// Comentário do RH para o denunciante (admin) — entra no histórico, sem apagar os anteriores
const comentarioSchema = z.object({
  texto: z.string().trim().min(1, 'Escreva o comentário').max(MAX_CARACTERES_COMENTARIO, `O comentário pode ter no máximo ${MAX_CARACTERES_COMENTARIO} caracteres`)
});

router.post('/:id/comentarios', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { texto } = comentarioSchema.parse(req.body);
    const ref = docRef('denuncias', req.params.id);
    const snap = await ref.get();
    if (!snap.exists || (await usuarioEhDenunciado(req.user!.id, snap.data() as any))) {
      return res.status(404).json({ error: 'Denúncia não encontrada' });
    }
    const item = await registrarNoHistorico(req.params.id, { tipo: 'COMENTARIO', texto, autorUserId: req.user!.id });
    await ref.set({ updatedAt: item.createdAt }, { merge: true });
    res.status(201).json(historicoParaRH(item));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Erro ao registrar comentário:', error);
    res.status(500).json({ error: 'Erro ao registrar comentário' });
  }
});

// Obter denúncia por ID (apenas admin)
router.get('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const denunciaSnap = await docRef('denuncias', req.params.id).get();
    const denuncia = snapData<any>(denunciaSnap as any);

    if (!denuncia || (await usuarioEhDenunciado(req.user!.id, denuncia))) {
      return res.status(404).json({ error: 'Denúncia não encontrada' });
    }

    const [gestorSnap, autorSnap] = await Promise.all([
      denuncia.gestorId ? docRef('gestores', denuncia.gestorId).get() : Promise.resolve(null),
      denuncia.autorId ? docRef('users', denuncia.autorId).get() : Promise.resolve(null)
    ]);
    const gestor = gestorSnap ? snapData<any>(gestorSnap as any) : null;
    const autor = autorSnap ? snapData<any>(autorSnap as any) : null;

    const gestorUserSnap = gestor ? await docRef('users', gestor.userId).get() : null;
    const gestorUser = gestorUserSnap ? snapData<any>(gestorUserSnap as any) : null;

    // Ocultar autor em denúncias anônimas
    res.json({
      ...denuncia,
      gestor: gestor ? { ...gestor, user: gestorUser ? { nome: gestorUser.nome } : null } : null,
      autor: denuncia.anonima ? null : autor ? { nome: autor.nome } : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter denúncia' });
  }
});

export default router;
