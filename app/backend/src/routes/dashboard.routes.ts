import { Router, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { authenticateToken, AuthRequest, requireAdmin } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// Dashboard do colaborador
router.get('/colaborador', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Minhas avaliações recentes
    const minhasAvaliacoes = await prisma.avaliacao.findMany({
      where: { autorId: userId },
      include: {
        gestor: {
          include: {
            user: { select: { nome: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Gestores mais bem avaliados
    const topGestores = await prisma.gestor.findMany({
      where: { totalAvaliacoes: { gte: 1 } },
      include: {
        user: { select: { nome: true } },
        badges: true
      },
      orderBy: { mediaAvaliacao: 'desc' },
      take: 5
    });

    // Estatísticas gerais
    const [totalGestores, totalAvaliacoes] = await Promise.all([
      prisma.gestor.count(),
      prisma.avaliacao.count()
    ]);

    res.json({
      minhasAvaliacoes,
      topGestores,
      stats: {
        totalGestores,
        totalAvaliacoes,
        minhasContribuicoes: minhasAvaliacoes.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter dashboard' });
  }
});

// Dashboard do gestor
router.get('/gestor', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== Role.GESTOR && req.user!.role !== Role.RH_ADMIN) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    const gestor = await prisma.gestor.findUnique({
      where: { userId: req.user!.id },
      include: {
        badges: true,
        avaliacoes: {
          include: {
            autor: { select: { nome: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!gestor) {
      return res.status(404).json({ error: 'Perfil de gestor não encontrado' });
    }

    // Calcular evolução mensal
    const todasAvaliacoes = await prisma.avaliacao.findMany({
      where: { gestorId: gestor.id },
      orderBy: { createdAt: 'asc' }
    });

    const evolucaoMensal = todasAvaliacoes.reduce((acc, av) => {
      const mes = av.createdAt.toISOString().slice(0, 7);
      if (!acc[mes]) {
        acc[mes] = { total: 0, soma: 0, elogios: 0, sugestoes: 0, criticas: 0 };
      }
      acc[mes].total++;
      acc[mes].soma += av.nota;
      if (av.elogio) acc[mes].elogios++;
      if (av.sugestao) acc[mes].sugestoes++;
      if (av.critica) acc[mes].criticas++;
      return acc;
    }, {} as Record<string, { total: number; soma: number; elogios: number; sugestoes: number; criticas: number }>);

    const evolucao = Object.entries(evolucaoMensal).map(([mes, data]) => ({
      mes,
      media: Number((data.soma / data.total).toFixed(1)),
      total: data.total,
      elogios: data.elogios,
      sugestoes: data.sugestoes,
      criticas: data.criticas
    }));

    // Contagem de feedbacks
    const feedbackStats = {
      elogios: todasAvaliacoes.filter(a => a.elogio).length,
      sugestoes: todasAvaliacoes.filter(a => a.sugestao).length,
      criticas: todasAvaliacoes.filter(a => a.critica).length
    };

    res.json({
      gestor: {
        id: gestor.id,
        cargo: gestor.cargo,
        departamento: gestor.departamento,
        foto: gestor.foto,
        mediaAvaliacao: gestor.mediaAvaliacao,
        totalAvaliacoes: gestor.totalAvaliacoes,
        badges: gestor.badges
      },
      avaliacoesRecentes: gestor.avaliacoes,
      evolucao,
      feedbackStats
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter dashboard' });
  }
});

// Dashboard RH/Admin
router.get('/admin', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { periodo } = req.query;

    let dateFilter = {};
    if (periodo) {
      const dias = Number(periodo);
      dateFilter = {
        createdAt: {
          gte: new Date(Date.now() - dias * 24 * 60 * 60 * 1000)
        }
      };
    }

    // Estatísticas gerais
    const [
      totalUsers,
      totalGestores,
      totalAvaliacoes,
      totalDenuncias,
      denunciasPendentes
    ] = await Promise.all([
      prisma.user.count(),
      prisma.gestor.count(),
      prisma.avaliacao.count({ where: dateFilter }),
      prisma.denuncia.count({ where: dateFilter }),
      prisma.denuncia.count({ where: { ...dateFilter, status: 'PENDENTE' } })
    ]);

    // Top gestores
    const topGestores = await prisma.gestor.findMany({
      where: { totalAvaliacoes: { gte: 1 } },
      include: {
        user: { select: { nome: true } }
      },
      orderBy: { mediaAvaliacao: 'desc' },
      take: 10
    });

    // Gestores com mais denúncias
    const gestoresComDenuncias = await prisma.denuncia.groupBy({
      by: ['gestorId'],
      _count: true,
      orderBy: {
        _count: {
          gestorId: 'desc'
        }
      },
      take: 5
    });

    const gestoresDenunciados = await Promise.all(
      gestoresComDenuncias.map(async (g) => {
        const gestor = await prisma.gestor.findUnique({
          where: { id: g.gestorId },
          include: { user: { select: { nome: true } } }
        });
        return {
          gestor,
          totalDenuncias: g._count
        };
      })
    );

    // Denúncias por tipo
    const denunciasPorTipo = await prisma.denuncia.groupBy({
      by: ['tipo'],
      _count: true
    });

    // Avaliações recentes
    const avaliacoesRecentes = await prisma.avaliacao.findMany({
      include: {
        gestor: {
          include: { user: { select: { nome: true } } }
        },
        autor: { select: { nome: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Denúncias recentes
    const denunciasRecentes = await prisma.denuncia.findMany({
      include: {
        gestor: {
          include: { user: { select: { nome: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    res.json({
      stats: {
        totalUsers,
        totalGestores,
        totalAvaliacoes,
        totalDenuncias,
        denunciasPendentes
      },
      topGestores,
      gestoresDenunciados,
      denunciasPorTipo: denunciasPorTipo.reduce((acc, d) => ({ ...acc, [d.tipo]: d._count }), {}),
      avaliacoesRecentes,
      denunciasRecentes
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter dashboard admin' });
  }
});

// Exportar dados (admin)
router.get('/export', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { tipo, formato = 'json' } = req.query;

    let data: any;

    switch (tipo) {
      case 'avaliacoes':
        data = await prisma.avaliacao.findMany({
          include: {
            gestor: { include: { user: { select: { nome: true } } } },
            autor: { select: { nome: true } }
          }
        });
        break;
      case 'denuncias':
        data = await prisma.denuncia.findMany({
          include: {
            gestor: { include: { user: { select: { nome: true } } } }
          }
        });
        // Ocultar autor em denúncias anônimas
        data = data.map((d: any) => ({
          ...d,
          autorId: d.anonima ? null : d.autorId
        }));
        break;
      case 'gestores':
        data = await prisma.gestor.findMany({
          include: {
            user: { select: { nome: true, email: true } },
            badges: true,
            _count: {
              select: { avaliacoes: true, denuncias: true }
            }
          }
        });
        break;
      default:
        return res.status(400).json({ error: 'Tipo de exportação inválido' });
    }

    if (formato === 'csv') {
      // Converter para CSV básico
      if (data.length === 0) {
        return res.status(200).send('');
      }
      const headers = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
      const csv = [
        headers.join(','),
        ...data.map((item: any) => headers.map(h => JSON.stringify(item[h] ?? '')).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${tipo}_export.csv`);
      return res.send(csv);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao exportar dados' });
  }
});

export default router;
