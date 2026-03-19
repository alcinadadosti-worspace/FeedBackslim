import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest, requireAdmin } from '../middleware/auth.middleware';
import { Role } from '../models';
import { col, docRef, normalizeFirestoreData, snapData } from '../firestoreRepo';

const router = Router();

const updateUserSchema = z.object({
  nome: z.string().min(2).optional(),
  avatar: z.string().optional()
});

// Listar todos os usuários (apenas admin)
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const snap = await col('users').orderBy('createdAt', 'desc').get();
    const users = snap.docs.map((d: any) => {
      const u: any = normalizeFirestoreData(d.data());
      return {
        id: d.id,
        email: u.email,
        nome: u.nome,
        role: u.role,
        avatar: u.avatar ?? null,
        createdAt: u.createdAt
      };
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// Obter usuário por ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userSnap = await docRef('users', req.params.id).get();
    const user = snapData<any>(userSnap as any);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const gestorQuery = await col('gestores').where('userId', '==', user.id).limit(1).get();
    const gestor = gestorQuery.empty ? null : normalizeFirestoreData(gestorQuery.docs[0].data());

    res.json({
      id: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role,
      avatar: user.avatar ?? null,
      createdAt: user.createdAt,
      gestor
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter usuário' });
  }
});

// Atualizar usuário
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.id !== req.params.id && req.user!.role !== Role.RH_ADMIN) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    const data = updateUserSchema.parse(req.body);

    const now = new Date();
    await docRef('users', req.params.id).set(
      {
        ...data,
        updatedAt: now
      },
      { merge: true }
    );

    const updatedSnap = await docRef('users', req.params.id).get();
    const user = snapData<any>(updatedSnap as any);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      id: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role,
      avatar: user.avatar ?? null
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

export default router;
