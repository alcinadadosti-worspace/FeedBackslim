import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { loginLimiter } from '../middleware/rateLimit.middleware';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { Role } from '../models';
import { col, docRef, normalizeFirestoreData, snapData } from '../firestoreRepo';

const router = Router();

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

    const existingSnap = await col('users').where('email', '==', data.email).limit(1).get();
    if (!existingSnap.empty) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const now = new Date();
    const userId = uuidv4();
    const role = data.role || Role.COLABORADOR;
    const userData = {
      id: userId,
      email: data.email,
      password: hashedPassword,
      nome: data.nome,
      role,
      avatar: null,
      createdAt: now,
      updatedAt: now
    };

    await docRef('users', userId).set(userData);

    const user = {
      id: userId,
      email: data.email,
      nome: data.nome,
      role
    };

    // Se for gestor, criar perfil automaticamente
    if (user.role === Role.GESTOR) {
      const gestorId = uuidv4();
      await docRef('gestores', gestorId).set({
        id: gestorId,
        userId: userId,
        cargo: 'Gestor',
        departamento: null,
        foto: null,
        bio: null,
        slackUserId: null,
        mediaAvaliacao: 0,
        totalAvaliacoes: 0,
        elogiosCount: 0,
        sugestoesCount: 0,
        criticasCount: 0,
        createdAt: now,
        updatedAt: now
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

    const userQuery = await col('users').where('email', '==', data.email).limit(1).get();
    const userSnap = userQuery.docs[0];
    const user = userSnap ? snapData<any>(userSnap as any) : null;

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

    const gestorQuery = await col('gestores').where('userId', '==', user.id).limit(1).get();
    const gestor = gestorQuery.empty ? null : normalizeFirestoreData(gestorQuery.docs[0].data());

    res.json({
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role,
        avatar: user.avatar,
        gestor
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
    const userSnap = await docRef('users', req.user!.id).get();
    const user = snapData<any>(userSnap as any);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const gestorQuery = await col('gestores').where('userId', '==', user.id).limit(1).get();
    const gestor = gestorQuery.empty ? null : normalizeFirestoreData(gestorQuery.docs[0].data());

    res.json({
      id: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role,
      avatar: user.avatar,
      gestor
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter usuário' });
  }
});

export default router;
