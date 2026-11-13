import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { authenticateToken, AuthRequest, requireAdmin } from '../middleware/auth.middleware';
import { docRef } from '../firestoreRepo';
import { usuarioEhDenunciado } from '../services/conflitoInteresse';
import { lerPedacosDoAnexo, listarAnexos, MAX_BYTES_POR_ARQUIVO, obterAnexo } from '../services/anexoStorage';
import { ProvaError, salvarProva, validarTokenProvas } from '../services/denunciaProvas.service';

// Montado dentro de denuncia.routes, então os caminhos ficam em /api/denuncias/...
//   Denunciante (token recebido ao criar a denúncia):  POST /anexos
//   RH (admin logado):  GET /:id/anexos   GET /:id/anexos/:anexoId
const router = Router();

interface ProvaRequest extends Request {
  provaDenunciaId?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function tratarErro(res: Response, error: unknown, mensagemPadrao: string) {
  if (error instanceof ProvaError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error(mensagemPadrao, error);
  if (!res.headersSent) res.status(500).json({ error: mensagemPadrao });
}

// ---------------------------------------------------------------------------
// Envio de provas pelo denunciante
// ---------------------------------------------------------------------------
function autenticarEnvioDeProvas(req: ProvaRequest, res: Response, next: NextFunction) {
  const header = req.headers['authorization'];
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
  const denunciaId = token ? validarTokenProvas(token) : null;
  if (!denunciaId) {
    return res.status(401).json({ error: 'O prazo para enviar provas desta denúncia terminou.' });
  }
  req.provaDenunciaId = denunciaId;
  next();
}

// Limite por denúncia (e não por IP)
const envioProvasLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => `provas:${(req as ProvaRequest).provaDenunciaId}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de envio. Tente novamente em 1 hora.' }
});

// O arquivo fica na memória até ser gravado: poucos envios grandes ao mesmo tempo,
// para o servidor (512 MB, dividido com o Next.js) não ficar sem memória
const MAX_UPLOADS_GRANDES_SIMULTANEOS = 3;
let uploadsGrandesEmAndamento = 0;

function limitarUploadsSimultaneos(req: Request, res: Response, next: NextFunction) {
  const cabecalho = req.headers['content-length'];
  const tamanho = Number(cabecalho || 0);
  if (tamanho > MAX_BYTES_POR_ARQUIVO + 1024 * 1024) {
    return res.status(413).json({ error: 'Arquivo muito grande. O limite é 30 MB por arquivo.' });
  }
  if (cabecalho && tamanho < 512 * 1024) return next();

  if (uploadsGrandesEmAndamento >= MAX_UPLOADS_GRANDES_SIMULTANEOS) {
    return res.status(503).json({ error: 'Muitos envios ao mesmo tempo. Tente de novo em alguns segundos.' });
  }
  uploadsGrandesEmAndamento++;
  let liberado = false;
  const liberar = () => {
    if (!liberado) {
      liberado = true;
      uploadsGrandesEmAndamento--;
    }
  };
  res.on('finish', liberar);
  res.on('close', liberar);
  next();
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES_POR_ARQUIVO, files: 1, fields: 5, fieldSize: 1024 }
});

function receberArquivo(req: Request, res: Response, next: NextFunction) {
  upload.single('arquivo')(req, res, (err: unknown) => {
    if (!err) return next();
    let mensagem = 'Não foi possível receber o arquivo.';
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') mensagem = 'Arquivo muito grande. O limite é 30 MB por arquivo.';
      if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') mensagem = 'Envie um arquivo por vez.';
    }
    res.status(400).json({ error: mensagem });
  });
}

router.post(
  '/anexos',
  autenticarEnvioDeProvas,
  envioProvasLimiter,
  limitarUploadsSimultaneos,
  receberArquivo,
  async (req: ProvaRequest, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      const anexo = await salvarProva(req.provaDenunciaId!, req.file);
      res.status(201).json({ id: anexo.id, nome: anexo.nome, tamanho: anexo.tamanho, categoria: anexo.categoria });
    } catch (error) {
      tratarErro(res, error, 'Erro ao enviar prova');
    }
  }
);

// ---------------------------------------------------------------------------
// RH
// ---------------------------------------------------------------------------
// Quem é a pessoa denunciada não vê as provas da própria denúncia
async function garantirAcessoRH(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const snap = await docRef('denuncias', req.params.id).get();
    if (!snap.exists || (await usuarioEhDenunciado(req.user!.id, snap.data() as any))) {
      return res.status(404).json({ error: 'Denúncia não encontrada' });
    }
    next();
  } catch (error) {
    tratarErro(res, error, 'Erro ao verificar acesso à denúncia');
  }
}

function esperarEscoamento(res: Response) {
  return new Promise<void>((resolve) => {
    const fim = () => {
      res.off('drain', fim);
      res.off('close', fim);
      resolve();
    };
    res.on('drain', fim);
    res.on('close', fim);
  });
}

function codificarRFC5987(valor: string) {
  return encodeURIComponent(valor).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

router.get('/:id/anexos', authenticateToken, requireAdmin, garantirAcessoRH, async (req: AuthRequest, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ data: await listarAnexos(req.params.id) });
  } catch (error) {
    tratarErro(res, error, 'Erro ao listar provas');
  }
});

router.get('/:id/anexos/:anexoId', authenticateToken, requireAdmin, garantirAcessoRH, async (req: AuthRequest, res: Response) => {
  try {
    const { id, anexoId } = req.params;
    if (!UUID_RE.test(anexoId)) return res.status(404).json({ error: 'Arquivo não encontrado' });
    const anexo = await obterAnexo(id, anexoId);
    if (!anexo) return res.status(404).json({ error: 'Arquivo não encontrado' });

    const nomeAscii = anexo.nome.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '_');
    res.status(200);
    // O tipo vem da lista permitida em anexoStorage.ts, nunca do que o navegador mandou
    res.setHeader('Content-Type', anexo.mimeType);
    res.setHeader('Content-Length', String(anexo.tamanho));
    res.setHeader('Content-Disposition', `attachment; filename="${nomeAscii}"; filename*=UTF-8''${codificarRFC5987(anexo.nome)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');

    try {
      for await (const pedaco of lerPedacosDoAnexo(id, anexoId, anexo.totalChunks)) {
        if (res.destroyed) return;
        if (!res.write(pedaco)) await esperarEscoamento(res);
      }
      res.end();
    } catch (error) {
      console.error('Erro ao enviar arquivo de prova:', error);
      res.destroy();
    }
  } catch (error) {
    tratarErro(res, error, 'Erro ao baixar prova');
  }
});

export default router;
