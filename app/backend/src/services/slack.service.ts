import { WebClient } from '@slack/web-api';
import { col, normalizeFirestoreData } from '../firestoreRepo';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

function getPublicBaseUrl(): string {
  const raw =
    process.env.FRONTEND_URL ||
    process.env.BACKEND_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

const FRONTEND_URL = getPublicBaseUrl();

function buildLoginRedirectUrl(nextPath: string): string {
  const next = nextPath.startsWith('/') ? nextPath : `/${nextPath}`;
  return `${FRONTEND_URL}/login?switch=1&next=${encodeURIComponent(next)}`;
}

interface EvaluationNotificationParams {
  slackUserId: string;
  gestorNome: string;
  nota: number;
  comentario: string;
  avaliacaoId: string;
}

interface ComplaintNotificationParams {
  denunciadoNome: string;
  denunciadoSlackId?: string | null; // nunca deve receber a própria denúncia
  tipo: string;
  tipoManifestacao?: string;
  temas?: string[];
  descricao?: string;
  denunciaId: string;
  anonima?: boolean;
  nomeIdentificado?: string;
  setorIdentificado?: string;
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
      text: `Você recebeu uma nova avaliação no Ouvidoria`,
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
            text: `Olá *${gestorNome}*! Você recebeu uma nova avaliação no Ouvidoria.`
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
              url: buildLoginRedirectUrl(`/dashboard/gestor?avaliacao=${avaliacaoId}`),
              style: 'primary'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Abrir Dashboard',
                emoji: true
              },
              url: buildLoginRedirectUrl('/dashboard/gestor')
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '📊 Ouvidoria - Plataforma de Feedback'
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
    const { denunciadoNome, tipo, tipoManifestacao, temas, descricao, denunciaId, anonima, nomeIdentificado, setorIdentificado } = params;

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

    const allRecipients = await getHighLeadershipSlackUserIds();
    // Garantia de segurança: a pessoa denunciada nunca recebe a própria denúncia
    const recipients = params.denunciadoSlackId
      ? allRecipients.filter((id) => id !== params.denunciadoSlackId)
      : allRecipients;
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
            text: `*Pessoa envolvida:*\n${denunciadoNome}`
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

    if (!anonima && (nomeIdentificado || setorIdentificado)) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Identificação do denunciante:*\n👤 Nome: ${nomeIdentificado || '-'}\n🏢 Setor: ${setorIdentificado || '-'}`
        }
      });
    } else if (anonima === false) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Identificação:* Denúncia identificada (sem nome/setor informados)`
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
          url: buildLoginRedirectUrl(`/admin/denuncias?id=${denunciaId}`),
          style: 'danger'
        }
      ]
    });

    for (const channel of recipients) {
      await slack.chat.postMessage({
        channel,
        text: `Nova manifestação registrada na ouvidoria do Ouvidoria`,
        blocks
      });
    }
  } catch (error) {
    console.error('Erro ao enviar notificação Slack de denúncia:', error);
    throw error;
  }
}

interface CollaboratorFeedbackNotificationParams {
  slackUserId: string;
  colaboradorNome: string;
  nota: number;
  comentario: string;
  feedbackId: string;
  urlPublico: string;
  urlPrivado: string;
}

// Enviar notificação de feedback para colaborador com botões interativos
export async function sendCollaboratorFeedbackNotification(params: CollaboratorFeedbackNotificationParams) {
  if (!process.env.SLACK_BOT_TOKEN) {
    console.log('Slack não configurado - notificação de feedback de colaborador não enviada');
    return;
  }

  try {
    const { slackUserId, colaboradorNome, nota, comentario, feedbackId, urlPublico, urlPrivado } = params;
    const testId = getTestSlackUserId();

    const message = {
      channel: testId || slackUserId,
      text: `Você recebeu um novo feedback no Ouvidoria`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '💬 Novo Feedback Recebido',
            emoji: true
          }
        },
        ...(testId ? [{
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Modo teste: originalmente para <@${slackUserId}>`
            }
          ]
        }] : []),
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Olá *${colaboradorNome}*! Você recebeu um feedback anônimo de um colega.`
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
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Deseja tornar este feedback público no site Ouvidoria?*\nSe aceitar, o feedback ficará visível na plataforma (de forma anônima). Se recusar, ficará apenas registrado internamente.'
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '✅ Tornar Público',
                emoji: true
              },
              url: urlPublico,
              style: 'primary'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🔒 Manter Privado',
                emoji: true
              },
              url: urlPrivado
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '📊 Ouvidoria - Plataforma de Feedback'
            }
          ]
        }
      ]
    };

    await slack.chat.postMessage(message);
    console.log(`Notificação de feedback de colaborador enviada para ${slackUserId}`);
  } catch (error) {
    console.error('Erro ao enviar notificação Slack de feedback de colaborador:', error);
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
