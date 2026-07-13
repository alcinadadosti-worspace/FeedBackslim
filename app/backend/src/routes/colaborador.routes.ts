import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest, requireAdmin } from '../middleware/auth.middleware';
import {
  listColaboradores,
  findColaboradorBySlackId,
  addColaborador,
  removeColaborador,
} from '../colaboradorRepo';

const router = Router();

const createColaboradorSchema = z.object({
  slackId: z
    .string()
    .trim()
    .regex(/^U[A-Z0-9]{6,}$/i, 'Slack ID inválido (deve começar com "U", ex: U0ABC12DEFG)'),
  nome: z.string().trim().min(2, 'Nome é obrigatório'),
});

// Listar todos os colaboradores (público)
router.get('/', async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    const list = await listColaboradores();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar colaboradores' });
  }
});

// Adicionar colaborador (apenas admin/RH)
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = createColaboradorSchema.parse(req.body);
    const slackId = data.slackId.toUpperCase();

    const existing = await findColaboradorBySlackId(slackId);
    if (existing) {
      return res
        .status(409)
        .json({ error: `Já existe um colaborador com esse Slack ID (${existing.nome}).` });
    }

    const colaborador = await addColaborador({ slackId, nome: data.nome });
    res.status(201).json(colaborador);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Erro ao adicionar colaborador' });
  }
});

// Remover colaborador (apenas admin/RH)
router.delete('/:slackId', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const slackId = req.params.slackId.trim();

    const existing = await findColaboradorBySlackId(slackId);
    if (!existing) {
      return res.status(404).json({ error: 'Colaborador não encontrado.' });
    }

    await removeColaborador(slackId);
    res.json({ success: true, slackId });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover colaborador' });
  }
});

export default router;
