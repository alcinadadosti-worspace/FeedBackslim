import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { avaliacaoLimiter } from '../middleware/rateLimit.middleware';
import { sendEvaluationNotification } from '../services/slack.service';

const router = Router();
const prisma = new PrismaClient();

const createAvaliacaoSchema = z.object({
  gestorId: z.string().uuid('ID do gestor inválido'),
  nota: z.number().min(1).max(10),
  elogio: z.string().optional(),
  sugestao: z.string().optional(),
  critica: z.string().optional()
});

// Listar avaliações (admin pode ver todas)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { gestorId, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (gestorId) {
      where.gestorId = gestorId;
    }

    const avaliacoes = await prisma.avaliacao.findMany({
      where,
      include: {
        gestor: {
          include: {
            user: {
              select: { nome: true }
            }
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

    const total = await prisma.avaliacao.count({ where });

    res.json({
      data: avaliacoes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar avaliações' });
  }
});

// Criar avaliação (anônima - não requer autenticação)
router.post('/', avaliacaoLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const data = createAvaliacaoSchema.parse(req.body);

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

    // Criar avaliação anônima (sem autorId)
    const avaliacao = await prisma.avaliacao.create({
      data: {
        gestorId: data.gestorId,
        nota: data.nota,
        elogio: data.elogio,
        sugestao: data.sugestao,
        critica: data.critica
      }
    });

    // Atualizar média do gestor
    const avaliacoes = await prisma.avaliacao.findMany({
      where: { gestorId: data.gestorId },
      select: { nota: true }
    });

    const mediaAvaliacao = avaliacoes.reduce((acc, a) => acc + a.nota, 0) / avaliacoes.length;

    await prisma.gestor.update({
      where: { id: data.gestorId },
      data: {
        mediaAvaliacao,
        totalAvaliacoes: avaliacoes.length
      }
    });

    // Verificar e atribuir badges
    await checkAndAssignBadges(data.gestorId);

    // Enviar notificação Slack
    if (gestor.slackUserId) {
      try {
        await sendEvaluationNotification({
          slackUserId: gestor.slackUserId,
          gestorNome: gestor.user.nome,
          nota: data.nota,
          comentario: data.elogio || data.sugestao || data.critica || '',
          avaliacaoId: avaliacao.id
        });
      } catch (slackError) {
        console.error('Erro ao enviar notificação Slack:', slackError);
      }
    }

    res.status(201).json(avaliacao);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar avaliação' });
  }
});

// Função para verificar e atribuir badges
async function checkAndAssignBadges(gestorId: string) {
  const gestor = await prisma.gestor.findUnique({
    where: { id: gestorId },
    include: {
      badges: true,
      avaliacoes: true
    }
  });

  if (!gestor) return;

  const badges = gestor.badges.map(b => b.tipo);

  // Badge "Líder Inspirador" - média >= 9 com pelo menos 10 avaliações
  if (gestor.mediaAvaliacao >= 9 && gestor.totalAvaliacoes >= 10 && !badges.includes('LIDER_INSPIRADOR')) {
    await prisma.badge.create({
      data: {
        gestorId,
        tipo: 'LIDER_INSPIRADOR',
        descricao: 'Média de avaliação acima de 9 com 10+ avaliações'
      }
    });
  }

  // Badge "Comunicador" - 20+ avaliações com elogios
  const elogios = gestor.avaliacoes.filter(a => a.elogio).length;
  if (elogios >= 20 && !badges.includes('COMUNICADOR')) {
    await prisma.badge.create({
      data: {
        gestorId,
        tipo: 'COMUNICADOR',
        descricao: 'Recebeu 20+ elogios de comunicação'
      }
    });
  }

  // Badge "Colaborativo" - 50+ avaliações totais
  if (gestor.totalAvaliacoes >= 50 && !badges.includes('COLABORATIVO')) {
    await prisma.badge.create({
      data: {
        gestorId,
        tipo: 'COLABORATIVO',
        descricao: 'Recebeu 50+ avaliações da equipe'
      }
    });
  }
}

// Obter avaliação por ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const avaliacao = await prisma.avaliacao.findUnique({
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

    if (!avaliacao) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }

    res.json(avaliacao);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter avaliação' });
  }
});

export default router;
