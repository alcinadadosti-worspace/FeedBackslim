import rateLimit from 'express-rate-limit';

// Rate limiter geral para API
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por janela
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' }
});

// Rate limiter para login
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // máximo 20 tentativas de login por 15 minutos
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

// Rate limiter para avaliações (baseado em IP para acesso anônimo)
export const avaliacaoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // máximo 20 avaliações por hora por IP
  message: { error: 'Muitas avaliações enviadas. Tente novamente em 1 hora.' }
});

// Rate limiter para denúncias (baseado em IP para acesso anônimo)
export const denunciaLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 denúncias por hora por IP
  message: { error: 'Muitas denuncias enviadas. Tente novamente em 1 hora.' }
});
