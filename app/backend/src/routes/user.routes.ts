import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest, requireAdmin } from '../middleware/auth.middleware';
import { Role } from '../models';
import { col, docRef, normalizeFirestoreData, snapData } from '../firestoreRepo';
import { firestore } from '../firebase';
import type { Query } from 'firebase-admin/firestore';

const router = Router();

const updateUserSchema = z.object({
  nome: z.string().min(2).optional(),
  avatar: z.string().optional()
});

async function deleteDocsByQuery(query: Query) {
  const snap = await query.get();
  if (snap.empty) return 0;
  let batch = firestore.batch();
  let count = 0;
  let deleted = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    deleted++;
    count++;
    if (count >= 450) {
      await batch.commit();
      batch = firestore.batch();
      count = 0;
    }
  }
  if (count > 0) {
    await batch.commit();
  }
  return deleted;
}

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

router.post('/cleanup-test-users', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const allowedNames = ['Probe', 'Gestor Teste'];

    const usersSnap = await col('users').where('nome', 'in', allowedNames).get();
    if (usersSnap.empty) {
      return res.json({
        deletedUsers: 0,
        deletedGestores: 0,
        deletedBadges: 0,
        deletedAvaliacoes: 0,
        deletedDenuncias: 0
      });
    }

    const userDocs = usersSnap.docs.map((d) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));
    const userIds = userDocs.map((u: any) => u.id);

    const gestoresSnap = await col('gestores').where('userId', 'in', userIds.slice(0, 10)).get();
    const gestorDocs = gestoresSnap.docs.map((d) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));
    const gestorIds = gestorDocs.map((g: any) => g.id);

    const deletedBadges = gestorIds.length
      ? await deleteDocsByQuery(col('badges').where('gestorId', 'in', gestorIds.slice(0, 10)))
      : 0;
    const deletedAvaliacoes = gestorIds.length
      ? await deleteDocsByQuery(col('avaliacoes').where('gestorId', 'in', gestorIds.slice(0, 10)))
      : 0;
    const deletedDenuncias = gestorIds.length
      ? await deleteDocsByQuery(col('denuncias').where('gestorId', 'in', gestorIds.slice(0, 10)))
      : 0;

    let batch = firestore.batch();
    let count = 0;

    for (const g of gestorDocs) {
      batch.delete(docRef('gestores', g.id));
      count++;
      if (count >= 450) {
        await batch.commit();
        batch = firestore.batch();
        count = 0;
      }
    }

    for (const u of userDocs) {
      batch.delete(docRef('users', u.id));
      count++;
      if (count >= 450) {
        await batch.commit();
        batch = firestore.batch();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    res.json({
      deletedUsers: userDocs.length,
      deletedGestores: gestorDocs.length,
      deletedBadges,
      deletedAvaliacoes,
      deletedDenuncias
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao limpar usuários de teste';
    res.status(500).json({ error: message });
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
