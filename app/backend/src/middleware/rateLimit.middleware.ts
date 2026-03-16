import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

const prisma = new PrismaClient();

// Rate limiter geral para API
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por janela
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' }
});

// Rate limiter para login
export const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // máximo 5 tentativas de login por hora
  message: { error: 'Muitas tentativas de login. Tente novamente em 1 hora.' }
});

// Middleware para verificar limite de avaliações por período
export const avaliacaoLimiter = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const { gestorId } = req.body;
  const userId = req.user.id;

  // Verificar se já avaliou este gestor nas últimas 24 horas
  const recentAvaliacao = await prisma.avaliacaoLog.findFirst({
    where: {
      autorId: userId,
      gestorId: gestorId,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // últimas 24 horas
      }
    }
  });

  if (recentAvaliacao) {
    return res.status(429).json({
      error: 'Você já avaliou este gestor nas últimas 24 horas. Aguarde para avaliar novamente.'
    });
  }

  // Verificar limite de avaliações totais por dia
  const avaliacoesHoje = await prisma.avaliacaoLog.count({
    where: {
      autorId: userId,
      createdAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    }
  });

  if (avaliacoesHoje >= 10) {
    return res.status(429).json({
      error: 'Você atingiu o limite de 10 avaliações por dia.'
    });
  }

  next();
};

// Middleware para verificar limite de denúncias
export const denunciaLimiter = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const userId = req.user.id;

  // Verificar limite de denúncias por semana
  const denunciasRecentes = await prisma.denuncia.count({
    where: {
      autorId: userId,
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // última semana
      }
    }
  });

  if (denunciasRecentes >= 5) {
    return res.status(429).json({
      error: 'Você atingiu o limite de denúncias por semana.'
    });
  }

  next();
};
