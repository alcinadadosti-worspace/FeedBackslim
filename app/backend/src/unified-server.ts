// Carrega o .env antes de qualquer módulo que leia process.env na importação (firebase, slack)
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
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
import colaboradorRoutes from './routes/colaborador.routes';
import feedbackColaboradorRoutes from './routes/feedbackColaborador.routes';

const PORT = parseInt(process.env.PORT || '3000', 10);
const NEXT_PORT = PORT + 1;

const app = express();

// O Render fica na frente como proxy: sem isso, req.ip é o IP do proxy e todos os
// usuários dividem o mesmo limite de requisições (rate limit)
app.set('trust proxy', 1);

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
app.use('/api/colaboradores', colaboradorRoutes);
app.use('/api/feedbacks/colaborador', feedbackColaboradorRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Erros não tratados da API (JSON inválido, arquivo grande demais etc.) voltam como JSON,
// e não como página HTML do Express
app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const error = err.code === 'LIMIT_FILE_SIZE' ? 'Arquivo muito grande.' : 'Não foi possível receber o arquivo.';
    return res.status(status).json({ error });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Requisição inválida.' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Conteúdo grande demais.' });
  }
  if (err instanceof Error && /Tipo de arquivo/.test(err.message)) {
    return res.status(400).json({ error: err.message });
  }
  console.error('Erro não tratado na API:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
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
  // Se o Next.js cair, encerra tudo para o Render reiniciar o serviço
  // (senão a API continua de pé e todas as páginas ficam fora do ar)
  proc.on('exit', (code, signal) => {
    console.error(`Next.js encerrou (code=${code}, signal=${signal}). Reiniciando o serviço.`);
    process.exit(1);
  });
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

process.on('SIGTERM', () => { nextProcess.removeAllListeners('exit'); nextProcess.kill(); process.exit(0); });
process.on('SIGINT', () => { nextProcess.removeAllListeners('exit'); nextProcess.kill(); process.exit(0); });
