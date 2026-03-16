import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Configuração do Multer para armazenamento local
const uploadDir = path.join(__dirname, '../../uploads');

// Criar diretório se não existir
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

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
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Upload de imagem
router.post('/', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

    res.json({
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao fazer upload' });
  }
});

// Deletar imagem
router.delete('/:filename', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const filePath = path.join(uploadDir, req.params.filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: 'Arquivo deletado com sucesso' });
    } else {
      res.status(404).json({ error: 'Arquivo não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar arquivo' });
  }
});

export default router;
