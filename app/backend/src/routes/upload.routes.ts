import { Router, Response } from 'express';
import multer from 'multer';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Use JPEG, PNG, GIF ou WebP.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 250 * 1024 // 250KB
  }
});

// Upload de imagem
router.post('/', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

    res.json({
      url: dataUrl,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error
        ? error.message
        : 'Erro ao fazer upload';
    res.status(500).json({ error: message });
  }
});

// Deletar imagem
router.delete('/:filename', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    res.json({ message: 'Arquivo deletado com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao deletar arquivo';
    res.status(500).json({ error: message });
  }
});

export default router;
