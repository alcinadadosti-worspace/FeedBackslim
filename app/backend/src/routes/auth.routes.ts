import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';
import { z } from 'zod';
import { loginLimiter } from '../middleware/rateLimit.middleware';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  role: z.nativeEnum(Role).optional()
});

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
});

// Registro
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        nome: data.nome,
        role: data.role || Role.COLABORADOR
      },
      select: {
        id: true,
        email: true,
        nome: true,
        role: true
      }
    });

    // Se for gestor, criar perfil automaticamente
    if (user.role === Role.GESTOR) {
      await prisma.gestor.create({
        data: {
          userId: user.id,
          cargo: 'Gestor'
        }
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'pulse360-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({ user, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// Login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        gestor: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const validPassword = await bcrypt.compare(data.password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'pulse360-secret',
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role,
        avatar: user.avatar,
        gestor: user.gestor
      },
      token
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Verificar token / obter usuário atual
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        nome: true,
        role: true,
        avatar: true,
        gestor: true
      }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter usuário' });
  }
});

export default router;
