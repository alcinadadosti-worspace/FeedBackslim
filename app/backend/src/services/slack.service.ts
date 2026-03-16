import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

const SLACK_RH_CHANNEL = process.env.SLACK_RH_CHANNEL || 'rh-notifications';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

interface EvaluationNotificationParams {
  slackUserId: string;
  gestorNome: string;
  nota: number;
  comentario: string;
  avaliacaoId: string;
}

interface ComplaintNotificationParams {
  gestorSlackId?: string;
  gestorNome: string;
  tipo: string;
  denunciaId: string;
}

// Enviar notificação de avaliação para o gestor
export async function sendEvaluationNotification(params: EvaluationNotificationParams) {
  if (!process.env.SLACK_BOT_TOKEN) {
    console.log('Slack não configurado - notificação de avaliação não enviada');
    return;
  }

  try {
    const { slackUserId, gestorNome, nota, comentario, avaliacaoId } = params;

    const message = {
      channel: slackUserId,
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
    const { gestorSlackId, gestorNome, tipo, denunciaId } = params;

    const tipoLabels: Record<string, string> = {
      ASSEDIO_MORAL: 'Assédio Moral',
      COMPORTAMENTO_INADEQUADO: 'Comportamento Inadequado',
      ABUSO_AUTORIDADE: 'Abuso de Autoridade',
      OUTROS: 'Outros'
    };

    // Notificação para o canal do RH
    const rhMessage = {
      channel: SLACK_RH_CHANNEL,
      text: `Nova denúncia registrada na ouvidoria do Pulse360`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 Nova Denúncia na Ouvidoria',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Uma nova denúncia foi registrada na ouvidoria do Pulse360.`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Gestor:*\n${gestorNome}`
            },
            {
              type: 'mrkdwn',
              text: `*Tipo:*\n${tipoLabels[tipo] || tipo}`
            },
            {
              type: 'mrkdwn',
              text: `*Data:*\n${new Date().toLocaleDateString('pt-BR')}`
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\nPendente`
            }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Ver Denúncia',
                emoji: true
              },
              url: `${FRONTEND_URL}/admin/denuncias/${denunciaId}`,
              style: 'danger'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Painel de Denúncias',
                emoji: true
              },
              url: `${FRONTEND_URL}/admin/denuncias`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '⚠️ Esta denúncia requer atenção da equipe de RH'
            }
          ]
        }
      ]
    };

    await slack.chat.postMessage(rhMessage);
    console.log(`Notificação de denúncia enviada para canal RH`);

    // Notificação discreta para o gestor (se tiver Slack configurado)
    if (gestorSlackId) {
      const gestorMessage = {
        channel: gestorSlackId,
        text: `Uma nova comunicação foi registrada sobre sua gestão no Pulse360`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `Uma nova comunicação foi registrada sobre sua gestão no Pulse360. O RH entrará em contato se necessário.`
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '📋 Pulse360 - Ouvidoria'
              }
            ]
          }
        ]
      };

      await slack.chat.postMessage(gestorMessage);
      console.log(`Notificação enviada para gestor ${gestorSlackId}`);
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
