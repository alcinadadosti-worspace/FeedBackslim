import { Router, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import admin from 'firebase-admin';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { getFirebaseAdminApp } from '../firebase';

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
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

function getProjectIdFromEnv(): string | undefined {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return undefined;
  try {
    const parsed = JSON.parse(json) as any;
    return parsed.project_id || parsed.projectId;
  } catch {
    return undefined;
  }
}

function getStorageBucketName(): string {
  const explicit = process.env.FIREBASE_STORAGE_BUCKET;
  if (explicit) return explicit;
  const projectId = getProjectIdFromEnv();
  if (!projectId) {
    throw new Error('Não foi possível determinar o bucket do Firebase Storage (FIREBASE_STORAGE_BUCKET ou FIREBASE_PROJECT_ID/FIREBASE_SERVICE_ACCOUNT_JSON)');
  }
  return `${projectId}.appspot.com`;
}

// Upload de imagem
router.post('/', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    getFirebaseAdminApp();
    const bucketName = getStorageBucketName();

    const extFromMime: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp'
    };
    const ext = extFromMime[req.file.mimetype] || '';
    const filename = `${uuidv4()}${ext}`;
    const objectPath = `uploads/${filename}`;

    const bucket = admin.storage().bucket(bucketName);
    const file = bucket.file(objectPath);
    await file.save(req.file.buffer, {
      contentType: req.file.mimetype,
      resumable: false,
      metadata: {
        cacheControl: 'public, max-age=31536000'
      }
    });

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 10
    });

    res.json({
      url: signedUrl,
      filename,
      path: objectPath,
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
    getFirebaseAdminApp();
    const bucketName = getStorageBucketName();
    const bucket = admin.storage().bucket(bucketName);
    const file = bucket.file(`uploads/${req.params.filename}`);
    await file.delete({ ignoreNotFound: true });
    res.json({ message: 'Arquivo deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar arquivo' });
  }
});

export default router;
