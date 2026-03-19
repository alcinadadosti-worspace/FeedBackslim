import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { spawn, ChildProcess } from 'child_process';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import gestorRoutes from './routes/gestor.routes';
import avaliacaoRoutes from './routes/avaliacao.routes';
import denunciaRoutes from './routes/denuncia.routes';
import dashboardRoutes from './routes/dashboard.routes';
import uploadRoutes from './routes/upload.routes';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const NEXT_PORT = PORT + 1;

const app = express();

// Middlewares for API
app.use('/api', cors());
app.use('/api', express.json({ limit: '2mb' }));
app.use('/api', express.urlencoded({ extended: true, limit: '2mb' }));

// Uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/gestores', gestorRoutes);
app.use('/api/avaliacoes', avaliacaoRoutes);
app.use('/api/denuncias', denunciaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Proxy to Next.js for all other routes
app.use('/', createProxyMiddleware({
  target: `http://127.0.0.1:${NEXT_PORT}`,
  changeOrigin: true,
}));

// Start Next.js
function startNextServer(): ChildProcess {
  // In production (dist/), __dirname is app/backend/dist
  // So we go up to app/, then into frontend/.next/standalone
  const nextPath = path.resolve(__dirname, '../../frontend/.next/standalone');
  console.log('Starting Next.js from:', nextPath);

  const proc = spawn('node', ['server.js'], {
    cwd: nextPath,
    env: { ...process.env, PORT: NEXT_PORT.toString(), HOSTNAME: '127.0.0.1' },
    stdio: 'inherit'
  });

  proc.on('error', (err) => console.error('Next.js error:', err));
  return proc;
}

console.log('Starting Ouvidoria...');
const nextProcess = startNextServer();

setTimeout(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`> Ouvidoria running on http://0.0.0.0:${PORT}`);
    console.log(`> API at /api, Frontend proxied from :${NEXT_PORT}`);
  });
}, 2000);

process.on('SIGTERM', () => { nextProcess.kill(); process.exit(0); });
process.on('SIGINT', () => { nextProcess.kill(); process.exit(0); });
