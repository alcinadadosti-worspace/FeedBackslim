import rateLimit from 'express-rate-limit';

// Rate limiter geral para API
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por janela
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' }
});

// Rate limiter para login (só tentativas com senha errada contam)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // máximo 20 tentativas erradas por 15 minutos
  skipSuccessfulRequests: true,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

// Rate limiter para cadastro de conta
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 30, // folga para várias pessoas da mesma rede (escritório) se cadastrarem
  message: { error: 'Muitos cadastros a partir desta rede. Tente novamente em 1 hora.' }
});

// Rate limiter para avaliações (baseado em IP para acesso anônimo)
export const avaliacaoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // máximo 20 avaliações por hora por IP
  message: { error: 'Muitas avaliações enviadas. Tente novamente em 1 hora.' }
});

// Rate limiter para feedbacks de colaborador (separado das avaliações de gestor)
export const feedbackColaboradorLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,
  message: { error: 'Muitos feedbacks enviados. Tente novamente em 1 hora.' }
});

// Rate limiter para denúncias (baseado em IP para acesso anônimo)
export const denunciaLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 denúncias por hora por IP
  message: { error: 'Muitas denúncias enviadas. Tente novamente em 1 hora.' }
});

// Rate limiter para consulta de protocolo (anti brute-force).
// Só códigos errados contam: quem consulta o próprio protocolo várias vezes (para ver o andamento)
// não é bloqueado, mas quem tenta adivinhar códigos é.
export const consultaProtocoloLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 códigos errados por hora por IP
  skipSuccessfulRequests: true,
  message: { error: 'Muitas tentativas de consulta. Tente novamente em 1 hora.' }
});
