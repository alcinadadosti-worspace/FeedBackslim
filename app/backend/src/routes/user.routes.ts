import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest, requireAdmin } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

const updateUserSchema = z.object({
  nome: z.string().min(2).optional(),
  avatar: z.string().optional()
});

// Listar todos os usuários (apenas admin)
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nome: true,
        role: true,
        avatar: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// Obter usuário por ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        nome: true,
        role: true,
        avatar: true,
        createdAt: true,
        gestor: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter usuário' });
  }
});

// Atualizar usuário
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.id !== req.params.id && req.user!.role !== 'RH_ADMIN') {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    const data = updateUserSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true,
        email: true,
        nome: true,
        role: true,
        avatar: true
      }
    });

    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

export default router;
