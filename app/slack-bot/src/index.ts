import { App, LogLevel } from '@slack/bolt';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BACKEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
const INTERNAL_BOT_SECRET = process.env.SLACK_BOT_TOKEN || '';

// Inicializar o app Slack Bolt
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  logLevel: LogLevel.INFO,
});

// Ação: colaborador aceita tornar feedback público
app.action('feedback_col_publico', async ({ action, ack, respond }) => {
  await ack();
  const feedbackId = (action as any).value;
  try {
    await axios.patch(
      `${BACKEND_URL}/api/feedbacks/colaborador/${feedbackId}/publica`,
      { publica: true },
      { headers: { 'x-internal-secret': INTERNAL_BOT_SECRET } }
    );
    await respond({
      replace_original: true,
      text: '✅ Feedback marcado como público no Pulse360. Obrigado!',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '✅ *Feedback tornado público!* Ele agora está visível na plataforma Pulse360. Obrigado por contribuir com a transparência!'
          }
        }
      ]
    });
  } catch (error) {
    console.error('Erro ao marcar feedback como público:', error);
    await respond({ text: 'Ocorreu um erro ao processar sua escolha. Tente novamente mais tarde.' });
  }
});

// Ação: colaborador mantém feedback privado
app.action('feedback_col_privado', async ({ action, ack, respond }) => {
  await ack();
  const feedbackId = (action as any).value;
  try {
    await axios.patch(
      `${BACKEND_URL}/api/feedbacks/colaborador/${feedbackId}/publica`,
      { publica: false },
      { headers: { 'x-internal-secret': INTERNAL_BOT_SECRET } }
    );
    await respond({
      replace_original: true,
      text: '🔒 Feedback mantido privado.',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '🔒 *Feedback mantido privado.* Ele ficará registrado internamente e não será exibido publicamente no site.'
          }
        }
      ]
    });
  } catch (error) {
    console.error('Erro ao manter feedback privado:', error);
    await respond({ text: 'Ocorreu um erro ao processar sua escolha. Tente novamente mais tarde.' });
  }
});

// Comando /pulse360
app.command('/pulse360', async ({ command, ack, respond }) => {
  await ack();

  const helpText = `
*Pulse360 - Plataforma de Feedback*

Comandos disponíveis:
• \`/pulse360 help\` - Mostra esta ajuda
• \`/pulse360 status\` - Verifica o status da integração
• \`/pulse360 link\` - Obtém o link para acessar a plataforma

Para mais informações, acesse ${process.env.FRONTEND_URL || 'http://localhost:3000'}
  `;

  const subcommand = command.text.trim().toLowerCase();

  switch (subcommand) {
    case 'help':
    case '':
      await respond({
        text: helpText,
        response_type: 'ephemeral',
      });
      break;

    case 'status':
      await respond({
        text: ':white_check_mark: Pulse360 está conectado e funcionando!',
        response_type: 'ephemeral',
      });
      break;

    case 'link':
      await respond({
        text: `:link: Acesse o Pulse360: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`,
        response_type: 'ephemeral',
      });
      break;

    default:
      await respond({
        text: `Comando desconhecido. Use \`/pulse360 help\` para ver os comandos disponíveis.`,
        response_type: 'ephemeral',
      });
  }
});

// Evento de menção ao bot
app.event('app_mention', async ({ event, say }) => {
  await say({
    text: `Olá <@${event.user}>! Sou o bot do Pulse360. Use o comando \`/pulse360 help\` para ver o que posso fazer.`,
    thread_ts: event.ts,
  });
});

// Evento de mensagem direta
app.event('message', async ({ event, say }) => {
  // Ignorar mensagens de bots
  if ((event as any).bot_id) return;

  // Responder apenas em DMs
  if ((event as any).channel_type === 'im') {
    await say({
      text: `Olá! Sou o bot do Pulse360.\n\n:bell: Você receberá notificações aqui quando:\n• Receber uma nova avaliação\n• Houver uma comunicação na ouvidoria sobre você\n\nPara acessar a plataforma: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`,
    });
  }
});

// Função para enviar notificação de avaliação
export async function sendEvaluationNotification(params: {
  slackUserId: string;
  gestorNome: string;
  nota: number;
  comentario: string;
  avaliacaoId: string;
}) {
  const { slackUserId, gestorNome, nota, comentario, avaliacaoId } = params;

  try {
    await app.client.chat.postMessage({
      channel: slackUserId,
      text: `Você recebeu uma nova avaliação no Pulse360`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: ':dart: Nova Avaliação Recebida',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Olá *${gestorNome}*! Você recebeu uma nova avaliação no Pulse360.`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Nota:*\n${'⭐'.repeat(Math.min(Math.ceil(nota / 2), 5))} ${nota}/10`,
            },
            {
              type: 'mrkdwn',
              text: `*Data:*\n${new Date().toLocaleDateString('pt-BR')}`,
            },
          ],
        },
        ...(comentario
          ? [
              {
                type: 'section' as const,
                text: {
                  type: 'mrkdwn' as const,
                  text: `*Comentário:*\n_"${comentario.substring(0, 200)}${
                    comentario.length > 200 ? '...' : ''
                  }"_`,
                },
              },
            ]
          : []),
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Ver Avaliação',
                emoji: true,
              },
              url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/avaliacoes/${avaliacaoId}`,
              style: 'primary',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Abrir Dashboard',
                emoji: true,
              },
              url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/gestor`,
            },
          ],
        },
      ],
    });

    console.log(`Notificação enviada para ${slackUserId}`);
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    throw error;
  }
}

// Função para enviar notificação de denúncia
export async function sendComplaintNotification(params: {
  gestorSlackId?: string;
  rhChannelId: string;
  gestorNome: string;
  tipo: string;
  denunciaId: string;
}) {
  const { gestorSlackId, rhChannelId, gestorNome, tipo, denunciaId } = params;

  const tipoLabels: Record<string, string> = {
    ASSEDIO_MORAL: 'Assédio Moral',
    COMPORTAMENTO_INADEQUADO: 'Comportamento Inadequado',
    ABUSO_AUTORIDADE: 'Abuso de Autoridade',
    OUTROS: 'Outros',
  };

  try {
    // Notificação para o canal do RH
    await app.client.chat.postMessage({
      channel: rhChannelId,
      text: `Nova denúncia registrada na ouvidoria do Pulse360`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: ':rotating_light: Nova Denúncia na Ouvidoria',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Uma nova denúncia foi registrada na ouvidoria do Pulse360.`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Gestor:*\n${gestorNome}`,
            },
            {
              type: 'mrkdwn',
              text: `*Tipo:*\n${tipoLabels[tipo] || tipo}`,
            },
            {
              type: 'mrkdwn',
              text: `*Data:*\n${new Date().toLocaleDateString('pt-BR')}`,
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\nPendente`,
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Ver Denúncia',
                emoji: true,
              },
              url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/denuncias/${denunciaId}`,
              style: 'danger',
            },
          ],
        },
      ],
    });

    // Notificação discreta para o gestor
    if (gestorSlackId) {
      await app.client.chat.postMessage({
        channel: gestorSlackId,
        text: `Uma nova comunicação foi registrada sobre sua gestão no Pulse360. O RH entrará em contato se necessário.`,
      });
    }

    console.log('Notificação de denúncia enviada');
  } catch (error) {
    console.error('Erro ao enviar notificação de denúncia:', error);
    throw error;
  }
}

// Iniciar o app
(async () => {
  const port = process.env.PORT || 3002;
  await app.start(port);
  console.log(`⚡️ Pulse360 Slack Bot está rodando na porta ${port}!`);
})();
