import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { avaliacaoLimiter } from '../middleware/rateLimit.middleware';
import { col, docRef, normalizeFirestoreData, snapData } from '../firestoreRepo';
import { sendCollaboratorFeedbackNotification } from '../services/slack.service';
import { COLABORADORES } from '../data/colaboradores';

const router = Router();

const createFeedbackSchema = z.object({
  colaboradorSlackId: z.string().min(1, 'ID do colaborador é obrigatório'),
  nota: z.number().min(1).max(10),
  elogio: z.string().optional(),
  sugestao: z.string().optional(),
  critica: z.string().optional()
});

// Criar feedback para colaborador (anônimo)
router.post('/', avaliacaoLimiter, async (req: Request, res: Response) => {
  try {
    const data = createFeedbackSchema.parse(req.body);

    const colaborador = COLABORADORES.find((c) => c.slackId === data.colaboradorSlackId);
    if (!colaborador) {
      return res.status(404).json({ error: 'Colaborador não encontrado' });
    }

    if (!data.elogio && !data.sugestao && !data.critica) {
      return res.status(400).json({ error: 'Adicione pelo menos um comentário (elogio, sugestão ou crítica)' });
    }

    const feedbackId = uuidv4();
    const now = new Date();

    await docRef('feedbacksColaborador', feedbackId).set({
      id: feedbackId,
      colaboradorSlackId: data.colaboradorSlackId,
      colaboradorNome: colaborador.nome,
      nota: data.nota,
      elogio: data.elogio ?? null,
      sugestao: data.sugestao ?? null,
      critica: data.critica ?? null,
      publica: false,
      createdAt: now
    });

    const comentario = data.elogio || data.sugestao || data.critica || '';
    try {
      await sendCollaboratorFeedbackNotification({
        slackUserId: data.colaboradorSlackId,
        colaboradorNome: colaborador.nome,
        nota: data.nota,
        comentario,
        feedbackId
      });
    } catch (slackError) {
      console.error('Erro ao enviar notificação Slack para colaborador:', slackError);
    }

    res.status(201).json({
      id: feedbackId,
      colaboradorSlackId: data.colaboradorSlackId,
      colaboradorNome: colaborador.nome,
      nota: data.nota,
      publica: false,
      createdAt: now
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao enviar feedback' });
  }
});

// Atualizar visibilidade do feedback (chamado pelo slack-bot via secret interno)
router.patch('/:id/publica', async (req: Request, res: Response) => {
  const secret = req.headers['x-internal-secret'];
  if (!secret || secret !== process.env.SLACK_BOT_TOKEN) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const body = z.object({ publica: z.boolean() }).parse(req.body);
    const feedbackId = req.params.id;

    const feedbackSnap = await docRef('feedbacksColaborador', feedbackId).get();
    const feedback = snapData<any>(feedbackSnap as any);

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback não encontrado' });
    }

    await docRef('feedbacksColaborador', feedbackId).set(
      { publica: body.publica, updatedAt: new Date() },
      { merge: true }
    );

    res.json({ id: feedbackId, publica: body.publica });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Erro ao atualizar visibilidade' });
  }
});

// Ranking de colaboradores (top 10 por média de feedbacks)
router.get('/ranking', async (req: Request, res: Response) => {
  try {
    const snap = await col('feedbacksColaborador').get();
    const feedbacks = snap.docs.map((d: any) => normalizeFirestoreData(d.data()) as any);

    const byColaborador: Record<string, { nome: string; total: number; soma: number }> = {};
    for (const f of feedbacks) {
      const id = f.colaboradorSlackId;
      if (!id) continue;
      if (!byColaborador[id]) {
        byColaborador[id] = { nome: f.colaboradorNome, total: 0, soma: 0 };
      }
      byColaborador[id].total++;
      byColaborador[id].soma += Number(f.nota || 0);
    }

    const ranking = Object.entries(byColaborador)
      .filter(([, v]) => v.total >= 1)
      .map(([slackId, v]) => ({
        slackId,
        nome: v.nome,
        totalFeedbacks: v.total,
        mediaFeedback: Number((v.soma / v.total).toFixed(2))
      }))
      .sort((a, b) => {
        const diff = b.mediaFeedback - a.mediaFeedback;
        return diff !== 0 ? diff : b.totalFeedbacks - a.totalFeedbacks;
      })
      .slice(0, 10);

    res.json(ranking);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter ranking de colaboradores' });
  }
});

// Listar feedbacks públicos de um colaborador
router.get('/publicos/:slackId', async (req: Request, res: Response) => {
  try {
    const { slackId } = req.params;
    const snap = await col('feedbacksColaborador')
      .where('colaboradorSlackId', '==', slackId)
      .where('publica', '==', true)
      .get();

    const feedbacks = snap.docs
      .map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }))
      .sort((a: any, b: any) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());

    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar feedbacks' });
  }
});

export default router;
