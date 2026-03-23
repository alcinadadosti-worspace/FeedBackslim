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
      text: '✅ Feedback marcado como público no Ouvidoria. Obrigado!',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '✅ *Feedback tornado público!* Ele agora está visível na plataforma Ouvidoria. Obrigado por contribuir com a transparência!'
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

// Comando /ouvidoria
app.command('/ouvidoria', async ({ command, ack, respond }) => {
  await ack();

  const helpText = `
*Ouvidoria - Plataforma de Feedback*

Comandos disponíveis:
• \`/ouvidoria help\` - Mostra esta ajuda
• \`/ouvidoria status\` - Verifica o status da integração
• \`/ouvidoria link\` - Obtém o link para acessar a plataforma

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
        text: ':white_check_mark: Ouvidoria está conectado e funcionando!',
        response_type: 'ephemeral',
      });
      break;

    case 'link':
      await respond({
        text: `:link: Acesse o Ouvidoria: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`,
        response_type: 'ephemeral',
      });
      break;

    default:
      await respond({
        text: `Comando desconhecido. Use \`/ouvidoria help\` para ver os comandos disponíveis.`,
        response_type: 'ephemeral',
      });
  }
});

// Evento de menção ao bot
app.event('app_mention', async ({ event, say }) => {
  await say({
    text: `Olá <@${event.user}>! Sou o bot do Ouvidoria. Use o comando \`/ouvidoria help\` para ver o que posso fazer.`,
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
      text: `Olá! Sou o bot do Ouvidoria.\n\n:bell: Você receberá notificações aqui quando:\n• Receber uma nova avaliação\n• Houver uma comunicação na ouvidoria sobre você\n\nPara acessar a plataforma: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`,
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
      text: `Você recebeu uma nova avaliação no Ouvidoria`,
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
            text: `Olá *${gestorNome}*! Você recebeu uma nova avaliação no Ouvidoria.`,
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

// Nota: notificações de denúncia são enviadas exclusivamente pelo backend (slack.service.ts)
// para garantir que o gestor denunciado nunca seja notificado. Não adicionar aqui.

// Iniciar o app
(async () => {
  const port = process.env.PORT || 3002;
  await app.start(port);
  console.log(`⚡️ Ouvidoria Slack Bot está rodando na porta ${port}!`);
})();
