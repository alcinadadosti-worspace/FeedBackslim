import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import next from 'next';
import { parse } from 'url';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import gestorRoutes from './routes/gestor.routes';
import avaliacaoRoutes from './routes/avaliacao.routes';
import denunciaRoutes from './routes/denuncia.routes';
import dashboardRoutes from './routes/dashboard.routes';
import uploadRoutes from './routes/upload.routes';

dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Next.js app - points to frontend directory
const nextApp = next({
  dev,
  hostname,
  port,
  dir: path.join(__dirname, '../../frontend')
});
const handle = nextApp.getRequestHandler();

async function startServer() {
  await nextApp.prepare();

  const app = express();

  // Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static files for uploads
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/gestores', gestorRoutes);
  app.use('/api/avaliacoes', avaliacaoRoutes);
  app.use('/api/denuncias', denunciaRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/upload', uploadRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Next.js handles all other routes
  app.all('*', (req, res) => {
    const parsedUrl = parse(req.url!, true);
    return handle(req, res, parsedUrl);
  });

  // Error handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Erro interno do servidor' });
  });

  app.listen(port, hostname, () => {
    console.log(`> Pulse360 running on http://${hostname}:${port}`);
    console.log(`> Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(console.error);
