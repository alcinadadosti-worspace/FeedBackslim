import { Router, Request, Response } from 'express';
import { COLABORADORES } from '../data/colaboradores';

const router = Router();

// Listar todos os colaboradores (público)
router.get('/', (req: Request, res: Response) => {
  const sorted = [...COLABORADORES].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  res.json(sorted);
});

export default router;
