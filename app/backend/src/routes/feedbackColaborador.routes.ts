import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import crypto from 'crypto';
import { avaliacaoLimiter } from '../middleware/rateLimit.middleware';
import { col, docRef, normalizeFirestoreData, snapData } from '../firestoreRepo';
import { sendCollaboratorFeedbackNotification } from '../services/slack.service';
import { COLABORADORES } from '../data/colaboradores';

const router = Router();

function getBaseUrl(): string {
  const raw =
    process.env.FRONTEND_URL ||
    process.env.BACKEND_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

function generateToken(feedbackId: string, publica: boolean): string {
  const secret = process.env.SLACK_BOT_TOKEN || 'fallback-secret';
  return crypto.createHmac('sha256', secret).update(`${feedbackId}:${publica}`).digest('hex');
}

function buildAceitarUrl(feedbackId: string, publica: boolean): string {
  const token = generateToken(feedbackId, publica);
  return `${getBaseUrl()}/api/feedbacks/colaborador/${feedbackId}/aceitar?publica=${publica}&token=${token}`;
}

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
        feedbackId,
        urlPublico: buildAceitarUrl(feedbackId, true),
        urlPrivado: buildAceitarUrl(feedbackId, false)
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

// Aceitar/recusar visibilidade via link do Slack (GET com token HMAC)
router.get('/:id/aceitar', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { publica: publicaStr, token } = req.query as { publica?: string; token?: string };

    if (!publicaStr || !token) {
      return res.status(400).send(htmlPage('Link inválido', 'Os parâmetros necessários estão ausentes.', false));
    }

    const publica = publicaStr === 'true';
    const expectedToken = generateToken(id, publica);

    if (token !== expectedToken) {
      return res.status(403).send(htmlPage('Link inválido', 'Este link não é válido ou já foi utilizado.', false));
    }

    const feedbackSnap = await docRef('feedbacksColaborador', id).get();
    const feedback = snapData<any>(feedbackSnap as any);

    if (!feedback) {
      return res.status(404).send(htmlPage('Não encontrado', 'Este feedback não existe.', false));
    }

    await docRef('feedbacksColaborador', id).set(
      { publica, updatedAt: new Date() },
      { merge: true }
    );

    if (publica) {
      return res.send(htmlPage(
        '✅ Feedback tornado público!',
        'Seu feedback agora está visível no Ouvidoria. Obrigado por contribuir com a transparência!',
        true
      ));
    } else {
      return res.send(htmlPage(
        '🔒 Feedback mantido privado.',
        'Seu feedback ficará registrado internamente e não será exibido publicamente no site.',
        true
      ));
    }
  } catch (error) {
    res.status(500).send(htmlPage('Erro', 'Ocorreu um erro ao processar sua escolha.', false));
  }
});

// Ranking de colaboradores (top 10 por média de feedbacks)
router.get('/ranking', async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    const snap = await col('feedbacksColaborador').get();
    const feedbacks = snap.docs.map((d: any) => normalizeFirestoreData(d.data()) as any);

    const byColaborador: Record<string, { nome: string; total: number; soma: number }> = {};
    for (const f of feedbacks) {
      const slackId = f.colaboradorSlackId;
      if (!slackId) continue;
      if (!byColaborador[slackId]) {
        byColaborador[slackId] = { nome: f.colaboradorNome, total: 0, soma: 0 };
      }
      byColaborador[slackId].total++;
      byColaborador[slackId].soma += Number(f.nota || 0);
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

// Listar todos os feedbacks públicos (todos os colaboradores)
router.get('/publicos', async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    const snap = await col('feedbacksColaborador')
      .where('publica', '==', true)
      .get();

    const feedbacks = snap.docs
      .map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }))
      .sort((a: any, b: any) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())
      .slice(0, 60);

    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar feedbacks públicos' });
  }
});

// Listar feedbacks públicos de um colaborador
router.get('/publicos/:slackId', async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
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

function htmlPage(title: string, message: string, success: boolean): string {
  const color = success ? '#16a34a' : '#dc2626';
  const bg = success ? '#f0fdf4' : '#fef2f2';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ouvidoria - ${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: white; border: 2px solid #171717; padding: 40px; max-width: 480px; width: 90%; text-align: center; box-shadow: 4px 4px 0 #171717; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 22px; color: #171717; margin: 0 0 12px; }
    p { color: #525252; margin: 0 0 24px; line-height: 1.5; }
    .badge { display: inline-block; padding: 6px 16px; background: ${bg}; border: 2px solid ${color}; color: ${color}; font-weight: 600; font-size: 13px; }
    .brand { margin-top: 24px; font-size: 12px; color: #a3a3a3; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '✅' : '⚠️'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <span class="badge">Ouvidoria</span>
    <p class="brand">Plataforma de Feedback</p>
  </div>
</body>
</html>`;
}

export default router;
