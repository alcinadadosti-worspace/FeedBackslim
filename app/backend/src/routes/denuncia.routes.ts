import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { authenticateToken, AuthRequest, requireAdmin } from '../middleware/auth.middleware';
import { denunciaLimiter, consultaProtocoloLimiter } from '../middleware/rateLimit.middleware';
import { sendComplaintNotification } from '../services/slack.service';
import { StatusDenuncia, TipoDenuncia } from '../models';
import { col, docRef, getManyByIds, normalizeFirestoreData, snapData } from '../firestoreRepo';
import { COLABORADORES } from '../data/colaboradores';

const router = Router();

const createDenunciaSchema = z.object({
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
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const snap = await col('denuncias').where('codigoProtocolo', '==', codigo).limit(1).get();
    if (snap.empty) return codigo;
  }
  // Fallback com timestamp se todas as tentativas colidirem (praticamente impossível)
  return `${Math.floor(100000 + Math.random() * 900000)}${Date.now().toString(36)}`;
}

// Listar denúncias (apenas admin)
// Nota: combinações de filtros múltiplos exigem índices compostos no Firestore
// (gestorId+createdAt, status+createdAt, tipo+createdAt) — criar em firestore.indexes.json
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { gestorId, status, tipo, page = '1', limit = '20' } = req.query;

    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    // Construir query dinamicamente com filtros nativos do Firestore
    let query: any = col('denuncias');
    if (gestorId) query = query.where('gestorId', '==', gestorId);
    if (status) query = query.where('status', '==', status);
    if (tipo) query = query.where('tipo', '==', tipo);

    const [countSnap, dataSnap] = await Promise.all([
      query.count().get(),
      query.orderBy('createdAt', 'desc').offset(skip).limit(take).get()
    ]);

    const total = countSnap.data().count;
    const denuncias = dataSnap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));

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
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar denúncias' });
  }
});

// Estatísticas de denúncias (admin)
router.get('/stats', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const snap = await col('denuncias').get();
    const denuncias = snap.docs.map((d: any) => normalizeFirestoreData(d.data()) as any);
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

// Criar denúncia (anônima - não requer autenticação)
router.post('/', denunciaLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const data = createDenunciaSchema.parse(req.body);

    let denunciadoNome = '';
    let denunciadoSlackId: string | null = null;

    if (data.gestorId) {
      const gestorSnap = await docRef('gestores', data.gestorId).get();
      const gestor = snapData<any>(gestorSnap as any);
      if (!gestor) {
        return res.status(404).json({ error: 'Gestor não encontrado' });
      }
      const gestorUserSnap = await docRef('users', gestor.userId).get();
      const gestorUser = snapData<any>(gestorUserSnap as any);
      denunciadoNome = gestorUser?.nome || 'Gestor';
      denunciadoSlackId = gestor.slackUserId ?? null;
    } else if (data.colaboradorSlackId) {
      const colaborador = COLABORADORES.find((c) => c.slackId === data.colaboradorSlackId);
      if (!colaborador) {
        return res.status(404).json({ error: 'Colaborador não encontrado' });
      }
      denunciadoNome = colaborador.nome;
      denunciadoSlackId = colaborador.slackId;
    }

    // Criar denúncia anônima (sem autorId)
    const now = new Date();
    const denunciaId = uuidv4();
    const codigoProtocolo = await gerarCodigoProtocolo();

    const tipo = (() => {
      const temas = data.temas || [];
      const has = (needle: string) => temas.some((t) => t.toLowerCase().includes(needle));
      if (has('assédio moral') || has('assedio moral')) return TipoDenuncia.ASSEDIO_MORAL;
      if (has('falhas de gestão') || has('falhas de gestao') || has('injustiça') || has('injustica') || has('liderança') || has('lideranca')) {
        return TipoDenuncia.ABUSO_AUTORIDADE;
      }
      if (has('conduta ética') || has('conduta etica') || has('assédio sexual') || has('assedio sexual') || has('discriminação') || has('discriminacao') || has('comportamento inadequado') || has('falta de respeito') || has('conflitos')) {
        return TipoDenuncia.COMPORTAMENTO_INADEQUADO;
      }
      return TipoDenuncia.OUTROS;
    })();

    await docRef('denuncias', denunciaId).set({
      id: denunciaId,
      gestorId: data.gestorId || null,
      colaboradorSlackId: data.colaboradorSlackId || null,
      colaboradorNome: data.colaboradorSlackId ? denunciadoNome : null,
      autorId: null,
      tipo,
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
      nomeIdentificado: !data.anonima ? (data.nomeIdentificado || null) : null,
      setorIdentificado: !data.anonima ? (data.setorIdentificado || null) : null,
      codigoProtocolo,
      comentarioRH: null,
      status: StatusDenuncia.PENDENTE,
      createdAt: now,
      updatedAt: now
    });

    // Enviar notificações Slack
    try {
      await sendComplaintNotification({
        denunciadoNome,
        denunciadoSlackId,
        tipo,
        tipoManifestacao: data.tipoManifestacao,
        temas: data.temas,
        descricao: data.descricao,
        denunciaId: denunciaId,
        anonima: data.anonima,
        nomeIdentificado: data.nomeIdentificado,
        setorIdentificado: data.setorIdentificado
      });
    } catch (slackError) {
      console.error('Erro ao enviar notificação Slack:', slackError);
    }

    res.status(201).json({
      id: denunciaId,
      tipo,
      tipoManifestacao: data.tipoManifestacao,
      status: StatusDenuncia.PENDENTE,
      codigoProtocolo,
      createdAt: now,
      message: 'Denúncia registrada com sucesso. O RH será notificado.'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar denúncia' });
  }
});

// Atualizar status da denúncia (apenas admin)
router.patch('/:id/status', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = updateStatusSchema.parse(req.body);

    const now = new Date();
    const updateData: any = { status: data.status, updatedAt: now };
    if (data.comentarioRH !== undefined) updateData.comentarioRH = data.comentarioRH;
    await docRef('denuncias', req.params.id).set(updateData, { merge: true });

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
    res.json({
      codigoProtocolo: denuncia.codigoProtocolo,
      status: denuncia.status,
      tipoManifestacao: denuncia.tipoManifestacao,
      comentarioRH: denuncia.comentarioRH || null,
      createdAt: denuncia.createdAt,
      updatedAt: denuncia.updatedAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao consultar denúncia' });
  }
});

// Obter denúncia por ID (apenas admin)
router.get('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const denunciaSnap = await docRef('denuncias', req.params.id).get();
    const denuncia = snapData<any>(denunciaSnap as any);

    if (!denuncia) {
      return res.status(404).json({ error: 'Denúncia não encontrada' });
    }

    const [gestorSnap, autorSnap] = await Promise.all([
      docRef('gestores', denuncia.gestorId).get(),
      denuncia.autorId ? docRef('users', denuncia.autorId).get() : Promise.resolve(null)
    ]);
    const gestor = snapData<any>(gestorSnap as any);
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
