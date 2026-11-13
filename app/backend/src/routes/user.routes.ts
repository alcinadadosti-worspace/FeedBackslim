import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest, requireAdmin, invalidarCacheUsuario } from '../middleware/auth.middleware';
import { Role } from '../models';
import { col, docRef, normalizeFirestoreData, snapData } from '../firestoreRepo';
import { firestore } from '../firebase';
import type { Query } from 'firebase-admin/firestore';

const router = Router();

const updateUserSchema = z.object({
  nome: z.string().min(2).optional(),
  avatar: z.string().optional()
});

function emGrupos<T>(lista: T[], tamanho = 10): T[][] {
  const grupos: T[][] = [];
  for (let i = 0; i < lista.length; i += tamanho) grupos.push(lista.slice(i, i + tamanho));
  return grupos;
}

async function deleteDocsByIn(colecao: string, campo: string, valores: string[]) {
  let total = 0;
  for (const grupo of emGrupos(valores)) {
    total += await deleteDocsByQuery(col(colecao).where(campo, 'in', grupo));
  }
  return total;
}

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

    const gestorDocs: any[] = [];
    for (const grupo of emGrupos(userIds)) {
      const gestoresSnap = await col('gestores').where('userId', 'in', grupo).get();
      gestorDocs.push(...gestoresSnap.docs.map((d) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) })));
    }
    const gestorIds = gestorDocs.map((g: any) => g.id);

    const deletedBadges = await deleteDocsByIn('badges', 'gestorId', gestorIds);
    const deletedAvaliacoes = await deleteDocsByIn('avaliacoes', 'gestorId', gestorIds);
    const deletedDenuncias = await deleteDocsByIn('denuncias', 'gestorId', gestorIds);

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
    userIds.forEach(invalidarCacheUsuario);

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

// Obter usuário por ID (o próprio usuário ou admin)
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.id !== req.params.id && req.user!.role !== Role.RH_ADMIN) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

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

// Promover/alterar role de usuário (apenas admin)
router.patch('/:id/role', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { role } = z.object({ role: z.nativeEnum(Role) }).parse(req.body);
    const { id } = req.params;

    const userSnap = await docRef('users', id).get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    await docRef('users', id).set({ role, updatedAt: new Date() }, { merge: true });
    invalidarCacheUsuario(id); // o novo papel vale na hora, sem esperar o cache de 60s
    res.json({ id, role });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Erro ao atualizar role' });
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
