import { Router, Response } from 'express';
import { PrismaClient, Role, TipoDenuncia, StatusDenuncia } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest, requireAdmin } from '../middleware/auth.middleware';
import { denunciaLimiter } from '../middleware/rateLimit.middleware';
import { sendComplaintNotification } from '../services/slack.service';

const router = Router();
const prisma = new PrismaClient();

const createDenunciaSchema = z.object({
  gestorId: z.string().uuid('ID do gestor inválido'),
  tipo: z.nativeEnum(TipoDenuncia),
  descricao: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  anonima: z.boolean().default(true)
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(StatusDenuncia)
});

// Listar denúncias (apenas admin)
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { gestorId, status, tipo, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (gestorId) where.gestorId = gestorId;
    if (status) where.status = status;
    if (tipo) where.tipo = tipo;

    const denuncias = await prisma.denuncia.findMany({
      where,
      include: {
        gestor: {
          include: {
            user: { select: { nome: true } }
          }
        },
        autor: {
          select: { nome: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    });

    // Ocultar autor em denúncias anônimas
    const denunciasFormatadas = denuncias.map(d => ({
      ...d,
      autor: d.anonima ? null : d.autor
    }));

    const total = await prisma.denuncia.count({ where });

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
    const [total, porStatus, porTipo] = await Promise.all([
      prisma.denuncia.count(),
      prisma.denuncia.groupBy({
        by: ['status'],
        _count: true
      }),
      prisma.denuncia.groupBy({
        by: ['tipo'],
        _count: true
      })
    ]);

    res.json({
      total,
      porStatus: porStatus.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {}),
      porTipo: porTipo.reduce((acc, t) => ({ ...acc, [t.tipo]: t._count }), {})
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter estatísticas' });
  }
});

// Criar denúncia
router.post('/', authenticateToken, denunciaLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const data = createDenunciaSchema.parse(req.body);

    // Verificar se o gestor existe
    const gestor = await prisma.gestor.findUnique({
      where: { id: data.gestorId },
      include: {
        user: { select: { nome: true } }
      }
    });

    if (!gestor) {
      return res.status(404).json({ error: 'Gestor não encontrado' });
    }

    // Criar denúncia
    const denuncia = await prisma.denuncia.create({
      data: {
        gestorId: data.gestorId,
        autorId: data.anonima ? null : req.user!.id,
        tipo: data.tipo,
        descricao: data.descricao,
        anonima: data.anonima
      }
    });

    // Enviar notificações Slack
    try {
      await sendComplaintNotification({
        gestorSlackId: gestor.slackUserId || undefined,
        gestorNome: gestor.user.nome,
        tipo: data.tipo,
        denunciaId: denuncia.id
      });
    } catch (slackError) {
      console.error('Erro ao enviar notificação Slack:', slackError);
    }

    res.status(201).json({
      id: denuncia.id,
      tipo: denuncia.tipo,
      status: denuncia.status,
      createdAt: denuncia.createdAt,
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

    const denuncia = await prisma.denuncia.update({
      where: { id: req.params.id },
      data: { status: data.status }
    });

    res.json(denuncia);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// Obter denúncia por ID (apenas admin)
router.get('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const denuncia = await prisma.denuncia.findUnique({
      where: { id: req.params.id },
      include: {
        gestor: {
          include: {
            user: { select: { nome: true } }
          }
        },
        autor: {
          select: { nome: true }
        }
      }
    });

    if (!denuncia) {
      return res.status(404).json({ error: 'Denúncia não encontrada' });
    }

    // Ocultar autor em denúncias anônimas
    res.json({
      ...denuncia,
      autor: denuncia.anonima ? null : denuncia.autor
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter denúncia' });
  }
});

export default router;
