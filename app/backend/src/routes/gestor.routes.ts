import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { authenticateToken, AuthRequest, requireGestorOrAdmin } from '../middleware/auth.middleware';
import { Role } from '../models';
import { col, docRef, getManyByIds, normalizeFirestoreData, snapData } from '../firestoreRepo';

const router = Router();

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
    const gestoresSnap = await col('gestores').orderBy('mediaAvaliacao', 'desc').get();
    const gestores = gestoresSnap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));

    const userIds = gestores.map((g: any) => g.userId);
    const usersById = await getManyByIds<any>('users', userIds);

    const badgesSnap = await col('badges').get();
    const badgesByGestorId = badgesSnap.docs.reduce<Record<string, any[]>>((acc: Record<string, any[]>, d: any) => {
      const b: any = normalizeFirestoreData(d.data());
      const gestorId = b.gestorId;
      if (!acc[gestorId]) acc[gestorId] = [];
      acc[gestorId].push({ id: d.id, ...b });
      return acc;
    }, {});

    const response = gestores.map((g: any) => {
      const user = usersById[g.userId];
      return {
        ...g,
        user: user
          ? { id: user.id, nome: (user as any).nome, email: (user as any).email }
          : null,
        badges: badgesByGestorId[g.id] || [],
        _count: { avaliacoes: g.totalAvaliacoes ?? 0 }
      };
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar gestores' });
  }
});

// Ranking de gestores (público - sem autenticação)
router.get('/ranking', async (req: AuthRequest, res: Response) => {
  try {
    const gestoresSnap = await col('gestores').where('totalAvaliacoes', '>=', 1).get();
    const gestores = gestoresSnap.docs
      .map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }))
      .sort((a: any, b: any) => {
        const mediaDiff = (b.mediaAvaliacao ?? 0) - (a.mediaAvaliacao ?? 0);
        if (mediaDiff !== 0) return mediaDiff;
        return (b.totalAvaliacoes ?? 0) - (a.totalAvaliacoes ?? 0);
      })
      .slice(0, 10);

    const usersById = await getManyByIds<any>('users', gestores.map((g: any) => g.userId));
    const badgesSnap = await col('badges').get();
    const badgesByGestorId = badgesSnap.docs.reduce<Record<string, any[]>>((acc: Record<string, any[]>, d: any) => {
      const b: any = normalizeFirestoreData(d.data());
      const gestorId = b.gestorId;
      if (!acc[gestorId]) acc[gestorId] = [];
      acc[gestorId].push({ id: d.id, ...b });
      return acc;
    }, {});

    const response = gestores.map((g: any) => {
      const user = usersById[g.userId];
      return {
        ...g,
        user: user ? { nome: (user as any).nome } : null,
        badges: badgesByGestorId[g.id] || []
      };
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter ranking' });
  }
});

// Obter gestor por ID (público - sem autenticação)
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const gestorSnap = await docRef('gestores', req.params.id).get();
    const gestor = snapData<any>(gestorSnap as any);

    if (!gestor) {
      return res.status(404).json({ error: 'Gestor não encontrado' });
    }

    const userSnap = await docRef('users', gestor.userId).get();
    const user = snapData<any>(userSnap as any);

    const badgesSnap = await col('badges').where('gestorId', '==', gestor.id).get();
    const badges = badgesSnap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));

    const avaliacoesSnap = await col('avaliacoes').where('gestorId', '==', gestor.id).get();
    const avaliacoes = avaliacoesSnap.docs
      .map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }))
      .sort((a: any, b: any) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())
      .slice(0, 20);

    const autorIds = avaliacoes.map((a: any) => a.autorId).filter(Boolean);
    const autoresById = await getManyByIds<any>('users', autorIds);

    const avaliacoesComAutor = avaliacoes.map((a: any) => ({
      ...a,
      autor: a.autorId ? { nome: (autoresById[a.autorId] as any)?.nome } : null
    }));

    res.json({
      ...gestor,
      user: user ? { id: user.id, nome: user.nome, email: user.email } : null,
      avaliacoes: avaliacoesComAutor,
      badges
    });
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

    const existingGestor = await col('gestores').where('userId', '==', req.user!.id).limit(1).get();

    if (!existingGestor.empty) {
      return res.status(400).json({ error: 'Você já possui um perfil de gestor' });
    }

    const data = createGestorSchema.parse(req.body);

    const now = new Date();
    const gestorId = uuidv4();
    await docRef('gestores', gestorId).set({
      id: gestorId,
      userId: req.user!.id,
      cargo: data.cargo,
      departamento: data.departamento ?? null,
      bio: data.bio ?? null,
      foto: data.foto ?? null,
      slackUserId: data.slackUserId ?? null,
      mediaAvaliacao: 0,
      totalAvaliacoes: 0,
      elogiosCount: 0,
      sugestoesCount: 0,
      criticasCount: 0,
      createdAt: now,
      updatedAt: now
    });

    const userSnap = await docRef('users', req.user!.id).get();
    const user = snapData<any>(userSnap as any);

    const gestor = {
      id: gestorId,
      userId: req.user!.id,
      ...data,
      mediaAvaliacao: 0,
      totalAvaliacoes: 0,
      createdAt: now,
      updatedAt: now,
      user: user ? { nome: user.nome, email: user.email } : null
    };

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
    const gestorSnap = await docRef('gestores', req.params.id).get();
    const gestor = snapData<any>(gestorSnap as any);

    if (!gestor) {
      return res.status(404).json({ error: 'Gestor não encontrado' });
    }

    // Verificar se é o próprio gestor ou admin
    if (gestor.userId !== req.user!.id && req.user!.role !== Role.RH_ADMIN) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    const data = updateGestorSchema.parse(req.body);

    const now = new Date();
    await docRef('gestores', req.params.id).set(
      {
        ...data,
        updatedAt: now
      },
      { merge: true }
    );

    const updatedSnap = await docRef('gestores', req.params.id).get();
    const updated = snapData<any>(updatedSnap as any);
    if (!updated) {
      return res.status(404).json({ error: 'Gestor não encontrado' });
    }

    const userSnap = await docRef('users', updated.userId).get();
    const user = snapData<any>(userSnap as any);

    const badgesSnap = await col('badges').where('gestorId', '==', updated.id).get();
    const badges = badgesSnap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));

    res.json({
      ...updated,
      user: user ? { nome: user.nome, email: user.email } : null,
      badges
    });
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
    const gestorSnap = await docRef('gestores', req.params.id).get();
    const gestor = snapData<any>(gestorSnap as any);

    if (!gestor) {
      return res.status(404).json({ error: 'Gestor não encontrado' });
    }

    // Verificar acesso
    if (gestor.userId !== req.user!.id && req.user!.role !== Role.RH_ADMIN) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    const avaliacoesSnap = await col('avaliacoes').where('gestorId', '==', gestor.id).get();
    const avaliacoes = avaliacoesSnap.docs
      .map((d: any) => normalizeFirestoreData(d.data()) as any)
      .sort((a: any, b: any) => (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime());

    const evolucaoMensal = avaliacoes.reduce((acc: any, av: any) => {
      const mes = (av.createdAt as Date).toISOString().slice(0, 7);
      if (!acc[mes]) {
        acc[mes] = { total: 0, soma: 0 };
      }
      acc[mes].total++;
      acc[mes].soma += av.nota;
      return acc;
    }, {} as Record<string, { total: number; soma: number }>);

    const evolucao = (Object.entries(evolucaoMensal) as Array<[string, { total: number; soma: number }]>).map(([mes, data]) => ({
      mes,
      media: data.soma / data.total,
      total: data.total
    }));

    // Contagem por tipo de feedback
    const feedbackStats = {
      elogios: avaliacoes.filter((a: any) => a.elogio).length,
      sugestoes: avaliacoes.filter((a: any) => a.sugestao).length,
      criticas: avaliacoes.filter((a: any) => a.critica).length
    };

    res.json({
      mediaGeral: gestor.mediaAvaliacao ?? 0,
      totalAvaliacoes: gestor.totalAvaliacoes ?? 0,
      evolucao,
      feedbackStats
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter estatísticas' });
  }
});

export default router;
