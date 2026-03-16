import { Router, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest, requireGestorOrAdmin } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

const updateGestorSchema = z.object({
  cargo: z.string().min(2).optional(),
  departamento: z.string().optional(),
  bio: z.string().optional(),
  foto: z.string().optional(),
  slackUserId: z.string().optional()
});

const createGestorSchema = z.object({
  cargo: z.string().min(2, 'Cargo é obrigatório'),
  departamento: z.string().optional(),
  bio: z.string().optional(),
  foto: z.string().optional(),
  slackUserId: z.string().optional()
});

// Listar todos os gestores (público - sem autenticação)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const gestores = await prisma.gestor.findMany({
      include: {
        user: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        },
        badges: true,
        _count: {
          select: {
            avaliacoes: true
          }
        }
      },
      orderBy: { mediaAvaliacao: 'desc' }
    });

    res.json(gestores);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar gestores' });
  }
});

// Ranking de gestores (público - sem autenticação)
router.get('/ranking', async (req: AuthRequest, res: Response) => {
  try {
    const gestores = await prisma.gestor.findMany({
      where: {
        totalAvaliacoes: { gte: 1 }
      },
      include: {
        user: {
          select: {
            nome: true
          }
        },
        badges: true
      },
      orderBy: [
        { mediaAvaliacao: 'desc' },
        { totalAvaliacoes: 'desc' }
      ],
      take: 10
    });

    res.json(gestores);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter ranking' });
  }
});

// Obter gestor por ID (público - sem autenticação)
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const gestor = await prisma.gestor.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        },
        avaliacoes: {
          include: {
            autor: {
              select: {
                nome: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        badges: true
      }
    });

    if (!gestor) {
      return res.status(404).json({ error: 'Gestor não encontrado' });
    }

    res.json(gestor);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter gestor' });
  }
});

// Criar perfil de gestor (usuário deve ser gestor)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== Role.GESTOR && req.user!.role !== Role.RH_ADMIN) {
      return res.status(403).json({ error: 'Apenas gestores podem criar perfil de gestor' });
    }

    const existingGestor = await prisma.gestor.findUnique({
      where: { userId: req.user!.id }
    });

    if (existingGestor) {
      return res.status(400).json({ error: 'Você já possui um perfil de gestor' });
    }

    const data = createGestorSchema.parse(req.body);

    const gestor = await prisma.gestor.create({
      data: {
        userId: req.user!.id,
        ...data
      },
      include: {
        user: {
          select: {
            nome: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(gestor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Erro ao criar perfil de gestor' });
  }
});

// Atualizar perfil de gestor
router.put('/:id', authenticateToken, requireGestorOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const gestor = await prisma.gestor.findUnique({
      where: { id: req.params.id }
    });

    if (!gestor) {
      return res.status(404).json({ error: 'Gestor não encontrado' });
    }

    // Verificar se é o próprio gestor ou admin
    if (gestor.userId !== req.user!.id && req.user!.role !== Role.RH_ADMIN) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    const data = updateGestorSchema.parse(req.body);

    const updated = await prisma.gestor.update({
      where: { id: req.params.id },
      data,
      include: {
        user: {
          select: {
            nome: true,
            email: true
          }
        },
        badges: true
      }
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Erro ao atualizar gestor' });
  }
});

// Estatísticas do gestor (privado para o gestor)
router.get('/:id/stats', authenticateToken, requireGestorOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const gestor = await prisma.gestor.findUnique({
      where: { id: req.params.id },
      include: {
        avaliacoes: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!gestor) {
      return res.status(404).json({ error: 'Gestor não encontrado' });
    }

    // Verificar acesso
    if (gestor.userId !== req.user!.id && req.user!.role !== Role.RH_ADMIN) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    // Calcular evolução mensal
    const evolucaoMensal = gestor.avaliacoes.reduce((acc, av) => {
      const mes = av.createdAt.toISOString().slice(0, 7);
      if (!acc[mes]) {
        acc[mes] = { total: 0, soma: 0 };
      }
      acc[mes].total++;
      acc[mes].soma += av.nota;
      return acc;
    }, {} as Record<string, { total: number; soma: number }>);

    const evolucao = Object.entries(evolucaoMensal).map(([mes, data]) => ({
      mes,
      media: data.soma / data.total,
      total: data.total
    }));

    // Contagem por tipo de feedback
    const feedbackStats = {
      elogios: gestor.avaliacoes.filter(a => a.elogio).length,
      sugestoes: gestor.avaliacoes.filter(a => a.sugestao).length,
      criticas: gestor.avaliacoes.filter(a => a.critica).length
    };

    res.json({
      mediaGeral: gestor.mediaAvaliacao,
      totalAvaliacoes: gestor.totalAvaliacoes,
      evolucao,
      feedbackStats
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter estatísticas' });
  }
});

export default router;
