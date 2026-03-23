import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '../models';
import { docRef, snapData } from '../firestoreRepo';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
  };
}

// Cache in-memory com TTL de 60s para evitar uma roundtrip ao Firestore a cada request autenticado
interface CachedUser { id: string; email: string; role: Role; expiresAt: number; }
const userCache = new Map<string, CachedUser>();
const USER_CACHE_TTL_MS = 60_000;

async function resolveUserFromToken(token: string): Promise<{ id: string; email: string; role: Role } | null> {
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ouvidoria-secret') as {
    id: string; email: string; role: Role;
  };

  const cached = userCache.get(decoded.id);
  if (cached && cached.expiresAt > Date.now()) {
    return { id: cached.id, email: cached.email, role: cached.role };
  }

  const userSnap = await docRef('users', decoded.id).get();
  const user = snapData<{ email: string; role: Role }>(userSnap as any);
  if (!user) return null;

  userCache.set(user.id, { id: user.id, email: user.email, role: user.role, expiresAt: Date.now() + USER_CACHE_TTL_MS });
  return { id: user.id, email: user.email, role: user.role };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso não fornecido' });
  }

  try {
    const user = await resolveUserFromToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// Versão opcional: não rejeita se não houver token ou se for inválido
export const optionalAuthenticateToken = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const user = await resolveUserFromToken(token);
      if (user) req.user = user;
    } catch {
      // token inválido — segue como anônimo
    }
  }

  next();
};

export const requireRole = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    next();
  };
};

export const requireGestorOrAdmin = requireRole(Role.GESTOR, Role.RH_ADMIN);
export const requireAdmin = requireRole(Role.RH_ADMIN);
