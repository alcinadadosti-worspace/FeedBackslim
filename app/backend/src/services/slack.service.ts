import { WebClient } from '@slack/web-api';
import { col, normalizeFirestoreData } from '../firestoreRepo';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

interface EvaluationNotificationParams {
  slackUserId: string;
  gestorNome: string;
  nota: number;
  comentario: string;
  avaliacaoId: string;
}

interface ComplaintNotificationParams {
  gestorNome: string;
  tipo: string;
  tipoManifestacao?: string;
  temas?: string[];
  descricao?: string;
  denunciaId: string;
}

function parseCommaList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getTestSlackUserId(): string | undefined {
  const value = process.env.SLACK_TEST_USER_ID;
  return value ? String(value).trim() : undefined;
}

async function getHighLeadershipSlackUserIds(): Promise<string[]> {
  const testId = getTestSlackUserId();
  if (testId) return [testId];

  const fromEnv = parseCommaList(process.env.SLACK_DENUNCIA_ESCALATION_IDS);
  if (fromEnv.length) return fromEnv;

  const emails = [
    'fernando@cpalcina.com',
    'luiz@cpalcina.com',
    'rafaela@cpalcina.com'
  ];

  const usersSnap = await col('users').where('email', 'in', emails).get();
  const users = usersSnap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));

  const slackIds: string[] = [];
  for (const u of users) {
    const gestoresSnap = await col('gestores').where('userId', '==', u.id).limit(1).get();
    if (!gestoresSnap.empty) {
      const gestor = normalizeFirestoreData(gestoresSnap.docs[0].data()) as any;
      if (gestor?.slackUserId) slackIds.push(String(gestor.slackUserId));
    }
  }

  return Array.from(new Set(slackIds));
}

// Enviar notificação de avaliação para o gestor
export async function sendEvaluationNotification(params: EvaluationNotificationParams) {
  if (!process.env.SLACK_BOT_TOKEN) {
    console.log('Slack não configurado - notificação de avaliação não enviada');
    return;
  }

  try {
    const { slackUserId, gestorNome, nota, comentario, avaliacaoId } = params;
    const testId = getTestSlackUserId();

    const message = {
      channel: testId || slackUserId,
      text: `Você recebeu uma nova avaliação no Pulse360`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎯 Nova Avaliação Recebida',
            emoji: true
          }
        },
        ...(testId ? [{
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `⚠️ Modo teste: originalmente para <@${slackUserId}>`
            }
          ]
        }] : []),
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Olá *${gestorNome}*! Você recebeu uma nova avaliação no Pulse360.`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Nota:*\n${'⭐'.repeat(Math.min(nota, 5))} ${nota}/10`
            },
            {
              type: 'mrkdwn',
              text: `*Data:*\n${new Date().toLocaleDateString('pt-BR')}`
            }
          ]
        },
        ...(comentario ? [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Comentário:*\n_"${comentario.substring(0, 200)}${comentario.length > 200 ? '...' : ''}"_`
          }
        }] : []),
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Ver Avaliação',
                emoji: true
              },
              url: `${FRONTEND_URL}/avaliacoes/${avaliacaoId}`,
              style: 'primary'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Abrir Dashboard',
                emoji: true
              },
              url: `${FRONTEND_URL}/dashboard/gestor`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '📊 Pulse360 - Plataforma de Feedback'
            }
          ]
        }
      ]
    };

    await slack.chat.postMessage(message);
    console.log(`Notificação de avaliação enviada para ${slackUserId}`);
  } catch (error) {
    console.error('Erro ao enviar notificação Slack:', error);
    throw error;
  }
}

// Enviar notificação de denúncia
export async function sendComplaintNotification(params: ComplaintNotificationParams) {
  if (!process.env.SLACK_BOT_TOKEN) {
    console.log('Slack não configurado - notificação de denúncia não enviada');
    return;
  }

  try {
    const { gestorNome, tipo, tipoManifestacao, temas, descricao, denunciaId } = params;

    const tipoLabels: Record<string, string> = {
      ASSEDIO_MORAL: 'Assédio Moral',
      COMPORTAMENTO_INADEQUADO: 'Comportamento Inadequado',
      ABUSO_AUTORIDADE: 'Abuso de Autoridade',
      OUTROS: 'Outros'
    };

    const tipoManifestacaoLabels: Record<string, string> = {
      DENUNCIA: 'Denúncia',
      RECLAMACAO: 'Reclamação',
      SUGESTAO_MELHORIA: 'Sugestão de melhoria',
      ELOGIO: 'Elogio',
      DUVIDA: 'Dúvida',
      OUTRO: 'Outro'
    };

    const recipients = await getHighLeadershipSlackUserIds();
    if (!recipients.length) {
      console.log('Slack não configurado - nenhum destinatário de alta liderança encontrado para denúncia');
      return;
    }

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 Nova Manifestação na Ouvidoria',
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Gestor envolvido:*\n${gestorNome}`
          },
          {
            type: 'mrkdwn',
            text: `*Classificação:*\n${tipoLabels[tipo] || tipo}`
          },
          {
            type: 'mrkdwn',
            text: `*Tipo de manifestação:*\n${tipoManifestacao ? (tipoManifestacaoLabels[tipoManifestacao] || tipoManifestacao) : '-'}`
          },
          {
            type: 'mrkdwn',
            text: `*Data:*\n${new Date().toLocaleDateString('pt-BR')}`
          }
        ]
      }
    ];

    if (temas?.length) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Temas:*\n${temas.slice(0, 8).map((t) => `• ${t}`).join('\n')}${temas.length > 8 ? '\n• ...' : ''}`
        }
      });
    }

    if (descricao) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Resumo:*\n_${descricao.substring(0, 240)}${descricao.length > 240 ? '...' : ''}_`
        }
      });
    }

    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Ver no Painel',
            emoji: true
          },
          url: `${FRONTEND_URL}/admin/denuncias/${denunciaId}`,
          style: 'danger'
        }
      ]
    });

    for (const channel of recipients) {
      await slack.chat.postMessage({
        channel,
        text: `Nova manifestação registrada na ouvidoria do Pulse360`,
        blocks
      });
    }
  } catch (error) {
    console.error('Erro ao enviar notificação Slack de denúncia:', error);
    throw error;
  }
}

// Verificar conexão com Slack
export async function testSlackConnection(): Promise<boolean> {
  if (!process.env.SLACK_BOT_TOKEN) {
    return false;
  }

  try {
    const result = await slack.auth.test();
    console.log('Slack conectado como:', result.user);
    return true;
  } catch (error) {
    console.error('Erro ao conectar com Slack:', error);
    return false;
  }
}
