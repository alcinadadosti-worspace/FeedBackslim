import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { avaliacaoLimiter } from '../middleware/rateLimit.middleware';
import { sendEvaluationNotification } from '../services/slack.service';
import { col, docRef, getManyByIds, normalizeFirestoreData, snapData } from '../firestoreRepo';
import { BadgeType } from '../models';
import { firestore } from '../firebase';
import { Role } from '../models';

const router = Router();

const createAvaliacaoSchema = z.object({
  gestorId: z.string().uuid('ID do gestor inválido'),
  nota: z.number().min(1).max(10),
  elogio: z.string().optional(),
  sugestao: z.string().optional(),
  critica: z.string().optional()
});

// Listar avaliações públicas de todos os gestores (sem autenticação)
router.get('/publicas', async (req: AuthRequest, res: Response) => {
  try {
    const snap = await col('avaliacoes')
      .where('publica', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(60)
      .get();

    const avaliacoes = snap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));

    const gestorIds = [...new Set(avaliacoes.map((a: any) => a.gestorId).filter(Boolean))];
    const gestoresById = await getManyByIds<any>('gestores', gestorIds);
    const userIds = Object.values(gestoresById).map((g: any) => g.userId).filter(Boolean);
    const usersById = await getManyByIds<any>('users', userIds);

    const data = avaliacoes.map((a: any) => {
      const gestor = gestoresById[a.gestorId];
      const user = gestor ? usersById[(gestor as any).userId] : undefined;
      return {
        ...a,
        gestor: gestor ? {
          id: (gestor as any).id,
          cargo: (gestor as any).cargo,
          foto: (gestor as any).foto,
          user: user ? { nome: (user as any).nome } : null
        } : null
      };
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar avaliações públicas' });
  }
});

// Listar avaliações (admin pode ver todas)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { gestorId, page = '1', limit = '20' } = req.query;

    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    let avaliacoes: any[] = [];
    let total = 0;

    if (gestorId) {
      const snap = await col('avaliacoes').where('gestorId', '==', gestorId).get();
      const all = snap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));
      total = all.length;
      avaliacoes = all
        .sort((a: any, b: any) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())
        .slice(skip, skip + take);
    } else {
      const pagedSnap = await col('avaliacoes')
        .orderBy('createdAt', 'desc')
        .offset(skip)
        .limit(take)
        .get();
      avaliacoes = pagedSnap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));
      total = (await col('avaliacoes').get()).size;
    }

    const gestorIds = avaliacoes.map((a: any) => a.gestorId).filter(Boolean);
    const autorIds = avaliacoes.map((a: any) => a.autorId).filter(Boolean);
    const gestoresById = await getManyByIds<any>('gestores', gestorIds);
    const gestorUserIds = Object.values(gestoresById).map((g: any) => (g as any).userId).filter(Boolean);
    const usersById = await getManyByIds<any>('users', [...autorIds, ...gestorUserIds]);

    const data = avaliacoes.map((a: any) => {
      const gestor = gestoresById[a.gestorId];
      const gestorUser = gestor ? usersById[(gestor as any).userId] : undefined;
      const autor = a.autorId ? usersById[a.autorId] : undefined;
      return {
        ...a,
        gestor: gestor
          ? {
              ...(gestor as any),
              user: gestorUser ? { nome: (gestorUser as any).nome } : null
            }
          : null,
        autor: autor ? { nome: (autor as any).nome } : null
      };
    });

    res.json({
      data,
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
    const gestorSnap = await docRef('gestores', data.gestorId).get();
    const gestor = snapData<any>(gestorSnap as any);

    if (!gestor) {
      return res.status(404).json({ error: 'Gestor não encontrado' });
    }

    const avaliacaoId = uuidv4();
    const now = new Date();

    await firestore.runTransaction(async (tx) => {
      const gestorRef = docRef('gestores', data.gestorId);
      const gestorTxSnap = await tx.get(gestorRef);
      if (!gestorTxSnap.exists) {
        throw new Error('Gestor não encontrado');
      }
      const g: any = normalizeFirestoreData(gestorTxSnap.data() as any);

      const totalAtual = Number(g.totalAvaliacoes || 0);
      const mediaAtual = Number(g.mediaAvaliacao || 0);
      const novoTotal = totalAtual + 1;
      const novaMedia = novoTotal === 0 ? 0 : (mediaAtual * totalAtual + data.nota) / novoTotal;

      const elogiosCountAtual = Number(g.elogiosCount || 0);
      const sugestoesCountAtual = Number(g.sugestoesCount || 0);
      const criticasCountAtual = Number(g.criticasCount || 0);

      tx.set(docRef('avaliacoes', avaliacaoId), {
        id: avaliacaoId,
        gestorId: data.gestorId,
        autorId: null,
        nota: data.nota,
        elogio: data.elogio ?? null,
        sugestao: data.sugestao ?? null,
        critica: data.critica ?? null,
        publica: false,
        createdAt: now
      });

      tx.update(gestorRef, {
        mediaAvaliacao: Number(novaMedia.toFixed(2)),
        totalAvaliacoes: novoTotal,
        elogiosCount: elogiosCountAtual + (data.elogio ? 1 : 0),
        sugestoesCount: sugestoesCountAtual + (data.sugestao ? 1 : 0),
        criticasCount: criticasCountAtual + (data.critica ? 1 : 0),
        updatedAt: now
      });
    });

    // Verificar e atribuir badges
    await checkAndAssignBadges(data.gestorId);

    // Enviar notificação Slack
    const gestorUserSnap = await docRef('users', gestor.userId).get();
    const gestorUser = snapData<any>(gestorUserSnap as any);
    if (gestor.slackUserId && gestorUser) {
      try {
        await sendEvaluationNotification({
          slackUserId: gestor.slackUserId,
          gestorNome: gestorUser.nome,
          nota: data.nota,
          comentario: data.elogio || data.sugestao || data.critica || '',
          avaliacaoId
        });
      } catch (slackError) {
        console.error('Erro ao enviar notificação Slack:', slackError);
      }
    }

    res.status(201).json({
      id: avaliacaoId,
      gestorId: data.gestorId,
      nota: data.nota,
      elogio: data.elogio,
      sugestao: data.sugestao,
      critica: data.critica,
      publica: false,
      createdAt: now
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar avaliação' });
  }
});

router.patch('/:id/publica', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const body = z.object({ publica: z.boolean() }).parse(req.body);
    const avaliacaoId = req.params.id;

    const avaliacaoSnap = await docRef('avaliacoes', avaliacaoId).get();
    const avaliacao = snapData<any>(avaliacaoSnap as any);
    if (!avaliacao) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }

    if (req.user?.role !== Role.RH_ADMIN) {
      if (req.user?.role !== Role.GESTOR) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }

      const gestorQuery = await col('gestores').where('userId', '==', req.user.id).limit(1).get();
      const gestorDoc = gestorQuery.docs[0];
      if (!gestorDoc) {
        return res.status(403).json({ error: 'Perfil de gestor não encontrado' });
      }
      if (gestorDoc.id !== avaliacao.gestorId) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }
    }

    await docRef('avaliacoes', avaliacaoId).set(
      {
        publica: body.publica,
        updatedAt: new Date()
      },
      { merge: true }
    );

    const updatedSnap = await docRef('avaliacoes', avaliacaoId).get();
    const updated = snapData<any>(updatedSnap as any);
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Erro ao atualizar visibilidade' });
  }
});

// Função para verificar e atribuir badges
async function checkAndAssignBadges(gestorId: string) {
  const gestorSnap = await docRef('gestores', gestorId).get();
  const gestor = snapData<any>(gestorSnap as any);
  if (!gestor) return;

  const badgesSnap = await col('badges').where('gestorId', '==', gestorId).get();
  const badges = badgesSnap.docs.map((d: any) => (normalizeFirestoreData(d.data()) as any).tipo);

  // Badge "Líder Inspirador" - média >= 9 com pelo menos 10 avaliações
  if (Number(gestor.mediaAvaliacao || 0) >= 9 && Number(gestor.totalAvaliacoes || 0) >= 10 && !badges.includes(BadgeType.LIDER_INSPIRADOR)) {
    const id = uuidv4();
    await docRef('badges', id).set({
      id,
      gestorId,
      tipo: BadgeType.LIDER_INSPIRADOR,
      descricao: 'Média de avaliação acima de 9 com 10+ avaliações',
      dataConquista: new Date()
    });
  }

  // Badge "Comunicador" - 20+ avaliações com elogios
  let elogios = Number(gestor.elogiosCount || 0);
  if (!Number.isFinite(elogios) || elogios === 0) {
    const avaliacoesSnap = await col('avaliacoes').where('gestorId', '==', gestorId).get();
    elogios = avaliacoesSnap.docs.map((d: any) => normalizeFirestoreData(d.data()) as any).filter((a: any) => a.elogio).length;
  }
  if (elogios >= 20 && !badges.includes(BadgeType.COMUNICADOR)) {
    const id = uuidv4();
    await docRef('badges', id).set({
      id,
      gestorId,
      tipo: BadgeType.COMUNICADOR,
      descricao: 'Recebeu 20+ elogios de comunicação',
      dataConquista: new Date()
    });
  }

  // Badge "Colaborativo" - 50+ avaliações totais
  if (Number(gestor.totalAvaliacoes || 0) >= 50 && !badges.includes(BadgeType.COLABORATIVO)) {
    const id = uuidv4();
    await docRef('badges', id).set({
      id,
      gestorId,
      tipo: BadgeType.COLABORATIVO,
      descricao: 'Recebeu 50+ avaliações da equipe',
      dataConquista: new Date()
    });
  }
}

// Obter avaliação por ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const avaliacaoSnap = await docRef('avaliacoes', req.params.id).get();
    const avaliacao = snapData<any>(avaliacaoSnap as any);

    if (!avaliacao) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }

    const [gestorSnap, autorSnap] = await Promise.all([
      docRef('gestores', avaliacao.gestorId).get(),
      avaliacao.autorId ? docRef('users', avaliacao.autorId).get() : Promise.resolve(null)
    ]);
    const gestor = snapData<any>(gestorSnap as any);
    const autor = autorSnap ? snapData<any>(autorSnap as any) : null;

    const gestorUserSnap = gestor ? await docRef('users', gestor.userId).get() : null;
    const gestorUser = gestorUserSnap ? snapData<any>(gestorUserSnap as any) : null;

    res.json({
      ...avaliacao,
      gestor: gestor ? { ...gestor, user: gestorUser ? { nome: gestorUser.nome } : null } : null,
      autor: autor ? { nome: autor.nome } : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter avaliação' });
  }
});

export default router;
