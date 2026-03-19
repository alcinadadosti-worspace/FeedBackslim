import { Router, Response } from 'express';
import { authenticateToken, AuthRequest, requireAdmin } from '../middleware/auth.middleware';
import { Role, StatusDenuncia } from '../models';
import { col, docRef, getManyByIds, normalizeFirestoreData, snapData } from '../firestoreRepo';

const router = Router();

// Dashboard do colaborador
router.get('/colaborador', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Minhas avaliações recentes
    const minhasSnap = await col('avaliacoes').where('autorId', '==', userId).get();
    const minhasAvaliacoesRaw = minhasSnap.docs
      .map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }))
      .sort((a: any, b: any) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())
      .slice(0, 5);
    const minhasGestorIds = minhasAvaliacoesRaw.map((a: any) => a.gestorId).filter(Boolean);
    const meusGestoresById = await getManyByIds<any>('gestores', minhasGestorIds);
    const meusGestorUserIds = Object.values(meusGestoresById).map((g: any) => (g as any).userId).filter(Boolean);
    const meusUsersById = await getManyByIds<any>('users', meusGestorUserIds);
    const minhasAvaliacoes = minhasAvaliacoesRaw.map((a: any) => {
      const gestor = meusGestoresById[a.gestorId];
      const gestorUser = gestor ? meusUsersById[(gestor as any).userId] : undefined;
      return {
        ...a,
        gestor: gestor ? { ...(gestor as any), user: gestorUser ? { nome: (gestorUser as any).nome } : null } : null
      };
    });

    // Gestores mais bem avaliados
    const topSnap = await col('gestores').where('totalAvaliacoes', '>=', 1).get();
    const topGestoresRaw = topSnap.docs
      .map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }))
      .sort((a: any, b: any) => (b.mediaAvaliacao ?? 0) - (a.mediaAvaliacao ?? 0))
      .slice(0, 5);

    const topUsersById = await getManyByIds<any>('users', topGestoresRaw.map((g: any) => g.userId));
    const badgesSnap = await col('badges').get();
    const badgesByGestorId = badgesSnap.docs.reduce<Record<string, any[]>>((acc: Record<string, any[]>, d: any) => {
      const b: any = normalizeFirestoreData(d.data());
      const gestorId = b.gestorId;
      if (!acc[gestorId]) acc[gestorId] = [];
      acc[gestorId].push({ id: d.id, ...b });
      return acc;
    }, {});

    const topGestores = topGestoresRaw.map((g: any) => ({
      ...g,
      user: topUsersById[g.userId] ? { nome: (topUsersById[g.userId] as any).nome } : null,
      badges: badgesByGestorId[g.id] || []
    }));

    // Estatísticas gerais
    const [totalGestores, totalAvaliacoes] = await Promise.all([
      col('gestores').get().then((s: any) => s.size),
      col('avaliacoes').get().then((s: any) => s.size)
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

    const gestorQuery = await col('gestores').where('userId', '==', req.user!.id).limit(1).get();
    const gestorDoc = gestorQuery.docs[0];
    const gestor = gestorDoc ? { id: gestorDoc.id, ...(normalizeFirestoreData(gestorDoc.data()) as any) } : null;

    if (!gestor) {
      return res.status(404).json({ error: 'Perfil de gestor não encontrado' });
    }

    const badgesSnap = await col('badges').where('gestorId', '==', gestor.id).get();
    const badges = badgesSnap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));

    const todasSnap = await col('avaliacoes').where('gestorId', '==', gestor.id).get();
    const todasAvaliacoes = todasSnap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));

    const recentesRaw = [...todasAvaliacoes]
      .sort((a: any, b: any) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())
      .slice(0, 10);

    const autorIds = recentesRaw.map((a: any) => a.autorId).filter(Boolean);
    const autoresById = await getManyByIds<any>('users', autorIds);
    const avaliacoesRecentes = recentesRaw.map((a: any) => ({
      ...a,
      autor: a.autorId ? { nome: (autoresById[a.autorId] as any)?.nome } : null
    }));

    // Calcular evolução mensal
    const evolucaoMensal = todasAvaliacoes.reduce((acc: any, av: any) => {
      const mes = (av.createdAt as Date).toISOString().slice(0, 7);
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

    const evolucao = (Object.entries(evolucaoMensal) as Array<[string, { total: number; soma: number; elogios: number; sugestoes: number; criticas: number }]>).map(([mes, data]) => ({
      mes,
      media: Number((data.soma / data.total).toFixed(1)),
      total: data.total,
      elogios: data.elogios,
      sugestoes: data.sugestoes,
      criticas: data.criticas
    }));

    // Contagem de feedbacks
    const feedbackStats = {
      elogios: todasAvaliacoes.filter((a: any) => a.elogio).length,
      sugestoes: todasAvaliacoes.filter((a: any) => a.sugestao).length,
      criticas: todasAvaliacoes.filter((a: any) => a.critica).length
    };

    res.json({
      gestor: {
        id: gestor.id,
        cargo: gestor.cargo,
        departamento: gestor.departamento,
        foto: gestor.foto,
        mediaAvaliacao: gestor.mediaAvaliacao,
        totalAvaliacoes: gestor.totalAvaliacoes,
        badges
      },
      avaliacoesRecentes,
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

    let fromDate: Date | null = null;
    if (periodo) {
      const dias = Number(periodo);
      fromDate = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
    }

    // Estatísticas gerais
    const [
      totalUsers,
      totalGestores,
      totalAvaliacoes,
      totalDenuncias,
      denunciasPendentes
    ] = await Promise.all([
      col('users').get().then((s: any) => s.size),
      col('gestores').get().then((s: any) => s.size),
      (fromDate
        ? col('avaliacoes').where('createdAt', '>=', fromDate).get().then((s: any) => s.size)
        : col('avaliacoes').get().then((s: any) => s.size)),
      (fromDate
        ? col('denuncias').where('createdAt', '>=', fromDate).get().then((s: any) => s.size)
        : col('denuncias').get().then((s: any) => s.size)),
      (fromDate
        ? col('denuncias')
            .where('createdAt', '>=', fromDate)
            .get()
            .then((s: any) =>
              s.docs.map((d: any) => normalizeFirestoreData(d.data()) as any).filter((d: any) => d.status === StatusDenuncia.PENDENTE).length
            )
        : col('denuncias')
            .where('status', '==', StatusDenuncia.PENDENTE)
            .get()
            .then((s: any) => s.size))
    ]);

    // Top gestores
    const topGestoresSnap = await col('gestores').where('totalAvaliacoes', '>=', 1).get();
    const topGestoresRaw = topGestoresSnap.docs
      .map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }))
      .sort((a: any, b: any) => (b.mediaAvaliacao ?? 0) - (a.mediaAvaliacao ?? 0))
      .slice(0, 10);
    const topGestoresUsersById = await getManyByIds<any>('users', topGestoresRaw.map((g: any) => g.userId));
    const topGestores = topGestoresRaw.map((g: any) => ({
      ...g,
      user: topGestoresUsersById[g.userId] ? { nome: (topGestoresUsersById[g.userId] as any).nome } : null
    }));

    // Gestores com mais denúncias
    const denunciasAllSnap = await col('denuncias').get();
    const denunciasAll = denunciasAllSnap.docs.map((d: any) => normalizeFirestoreData(d.data()) as any);
    const denunciasCountByGestorId = denunciasAll.reduce<Record<string, number>>((acc: Record<string, number>, d: any) => {
      acc[d.gestorId] = (acc[d.gestorId] || 0) + 1;
      return acc;
    }, {});
    const topDenunciados = (Object.entries(denunciasCountByGestorId) as Array<[string, number]>)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const gestoresById = await getManyByIds<any>('gestores', topDenunciados.map(([gestorId]) => gestorId));
    const gestoresUsersById = await getManyByIds<any>(
      'users',
      Object.values(gestoresById).map((g: any) => (g as any).userId).filter(Boolean)
    );
    const gestoresDenunciados = topDenunciados.map(([gestorId, total]) => {
      const gestor = gestoresById[gestorId];
      const gestorUser = gestor ? gestoresUsersById[(gestor as any).userId] : undefined;
      return {
        gestor: gestor ? { ...(gestor as any), user: gestorUser ? { nome: (gestorUser as any).nome } : null } : null,
        totalDenuncias: total
      };
    });

    // Denúncias por tipo
    const denunciasPorTipo = denunciasAll.reduce<Record<string, number>>((acc: Record<string, number>, d: any) => {
      acc[d.tipo] = (acc[d.tipo] || 0) + 1;
      return acc;
    }, {});

    // Avaliações recentes
    const avaliacoesRecentesSnap = await col('avaliacoes').orderBy('createdAt', 'desc').limit(10).get();
    const avaliacoesRecentesRaw = avaliacoesRecentesSnap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));
    const avaliacoesGestorIds = avaliacoesRecentesRaw.map((a: any) => a.gestorId).filter(Boolean);
    const avaliacoesAutorIds = avaliacoesRecentesRaw.map((a: any) => a.autorId).filter(Boolean);
    const avalGestoresById = await getManyByIds<any>('gestores', avaliacoesGestorIds);
    const avalGestorUserIds = Object.values(avalGestoresById).map((g: any) => (g as any).userId).filter(Boolean);
    const avalUsersById = await getManyByIds<any>('users', [...avaliacoesAutorIds, ...avalGestorUserIds]);
    const avaliacoesRecentes = avaliacoesRecentesRaw.map((a: any) => {
      const gestor = avalGestoresById[a.gestorId];
      const gestorUser = gestor ? avalUsersById[(gestor as any).userId] : undefined;
      const autor = a.autorId ? avalUsersById[a.autorId] : undefined;
      return {
        ...a,
        gestor: gestor ? { ...(gestor as any), user: gestorUser ? { nome: (gestorUser as any).nome } : null } : null,
        autor: autor ? { nome: (autor as any).nome } : null
      };
    });

    // Denúncias recentes
    const denunciasRecentesSnap = await col('denuncias').orderBy('createdAt', 'desc').limit(10).get();
    const denunciasRecentesRaw = denunciasRecentesSnap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));
    const denunciasGestorIds = denunciasRecentesRaw.map((d: any) => d.gestorId).filter(Boolean);
    const denGestoresById = await getManyByIds<any>('gestores', denunciasGestorIds);
    const denGestorUserIds = Object.values(denGestoresById).map((g: any) => (g as any).userId).filter(Boolean);
    const denUsersById = await getManyByIds<any>('users', denGestorUserIds);
    const denunciasRecentes = denunciasRecentesRaw.map((d: any) => {
      const gestor = denGestoresById[d.gestorId];
      const gestorUser = gestor ? denUsersById[(gestor as any).userId] : undefined;
      return {
        ...d,
        gestor: gestor ? { ...(gestor as any), user: gestorUser ? { nome: (gestorUser as any).nome } : null } : null
      };
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
      denunciasPorTipo,
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
        {
          const snap = await col('avaliacoes').get();
          const avaliacoes = snap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));
          const gestorIds = avaliacoes.map((a: any) => a.gestorId).filter(Boolean);
          const autorIds = avaliacoes.map((a: any) => a.autorId).filter(Boolean);
          const gestoresById = await getManyByIds<any>('gestores', gestorIds);
          const gestorUserIds = Object.values(gestoresById).map((g: any) => (g as any).userId).filter(Boolean);
          const usersById = await getManyByIds<any>('users', [...autorIds, ...gestorUserIds]);
          data = avaliacoes.map((a: any) => {
            const gestor = gestoresById[a.gestorId];
            const gestorUser = gestor ? usersById[(gestor as any).userId] : undefined;
            const autor = a.autorId ? usersById[a.autorId] : undefined;
            return {
              ...a,
              gestor: gestor ? { ...(gestor as any), user: gestorUser ? { nome: (gestorUser as any).nome } : null } : null,
              autor: autor ? { nome: (autor as any).nome } : null
            };
          });
        }
        break;
      case 'denuncias':
        {
          const snap = await col('denuncias').get();
          const denuncias = snap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));
          const gestorIds = denuncias.map((d: any) => d.gestorId).filter(Boolean);
          const gestoresById = await getManyByIds<any>('gestores', gestorIds);
          const gestorUserIds = Object.values(gestoresById).map((g: any) => (g as any).userId).filter(Boolean);
          const usersById = await getManyByIds<any>('users', gestorUserIds);
          data = denuncias.map((d: any) => {
            const gestor = gestoresById[d.gestorId];
            const gestorUser = gestor ? usersById[(gestor as any).userId] : undefined;
            return {
              ...d,
              gestor: gestor ? { ...(gestor as any), user: gestorUser ? { nome: (gestorUser as any).nome } : null } : null
            };
          });
        }
        // Ocultar autor em denúncias anônimas
        data = data.map((d: any) => ({
          ...d,
          autorId: d.anonima ? null : d.autorId
        }));
        break;
      case 'gestores':
        {
          const gestoresSnap = await col('gestores').get();
          const gestores = gestoresSnap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));
          const usersById = await getManyByIds<any>('users', gestores.map((g: any) => g.userId));
          const badgesSnap = await col('badges').get();
          const badgesByGestorId = badgesSnap.docs.reduce<Record<string, any[]>>((acc: Record<string, any[]>, d: any) => {
            const b: any = normalizeFirestoreData(d.data());
            const gestorId = b.gestorId;
            if (!acc[gestorId]) acc[gestorId] = [];
            acc[gestorId].push({ id: d.id, ...b });
            return acc;
          }, {});

          const denunciasSnap = await col('denuncias').get();
          const denuncias = denunciasSnap.docs.map((d: any) => normalizeFirestoreData(d.data()) as any);
          const denunciasCountByGestorId = denuncias.reduce<Record<string, number>>((acc: Record<string, number>, d: any) => {
            acc[d.gestorId] = (acc[d.gestorId] || 0) + 1;
            return acc;
          }, {});

          data = gestores.map((g: any) => {
            const user = usersById[g.userId];
            return {
              ...g,
              user: user ? { nome: (user as any).nome, email: (user as any).email } : null,
              badges: badgesByGestorId[g.id] || [],
              _count: {
                avaliacoes: g.totalAvaliacoes ?? 0,
                denuncias: denunciasCountByGestorId[g.id] || 0
              }
            };
          });
        }
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
