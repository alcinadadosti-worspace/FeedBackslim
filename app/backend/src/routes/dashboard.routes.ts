import { Router, Response } from 'express';
import { authenticateToken, AuthRequest, requireAdmin } from '../middleware/auth.middleware';
import { Role, StatusDenuncia } from '../models';
import { col, docRef, getManyByIds, normalizeFirestoreData, snapData } from '../firestoreRepo';
import ExcelJS from 'exceljs';

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

    // Estatísticas gerais — count() não lê documentos, apenas o índice
    const [totalGestores, totalAvaliacoes] = await Promise.all([
      col('gestores').count().get().then((s: any) => s.data().count),
      col('avaliacoes').count().get().then((s: any) => s.data().count)
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

    // Estatísticas gerais — count() não lê documentos, apenas o índice
    const denunciasBase: any = fromDate ? col('denuncias').where('createdAt', '>=', fromDate) : col('denuncias');
    const denunciasPendentesBase: any = fromDate
      ? col('denuncias').where('createdAt', '>=', fromDate).where('status', '==', StatusDenuncia.PENDENTE)
      : col('denuncias').where('status', '==', StatusDenuncia.PENDENTE);

    const [
      totalUsers,
      totalGestores,
      avaliacoesSnap,
      totalDenuncias,
      denunciasPendentes,
      totalFeedbacksColaboradores
    ] = await Promise.all([
      col('users').count().get().then((s: any) => s.data().count),
      col('gestores').count().get().then((s: any) => s.data().count),
      (fromDate ? col('avaliacoes').where('createdAt', '>=', fromDate).get() : col('avaliacoes').get()),
      denunciasBase.count().get().then((s: any) => s.data().count),
      denunciasPendentesBase.count().get().then((s: any) => s.data().count),
      col('feedbacksColaborador').count().get().then((s: any) => s.data().count)
    ]);

    const totalAvaliacoes = avaliacoesSnap.size;
    const notasAvaliacoes = avaliacoesSnap.docs.map((d: any) => (normalizeFirestoreData(d.data()) as any).nota).filter((n: any) => typeof n === 'number');
    const mediaGeralAvaliacoes = notasAvaliacoes.length > 0
      ? Number((notasAvaliacoes.reduce((a: number, b: number) => a + b, 0) / notasAvaliacoes.length).toFixed(1))
      : 0;

    // Top gestores, denúncias (all + recentes), avaliações recentes — tudo em paralelo
    const [
      topGestoresSnap,
      denunciasAllSnap,
      avaliacoesRecentesSnap
    ] = await Promise.all([
      col('gestores').where('totalAvaliacoes', '>=', 1).get(),
      col('denuncias').get(),
      col('avaliacoes').orderBy('createdAt', 'desc').limit(10).get()
    ]);

    // Top gestores
    const topGestoresRaw = topGestoresSnap.docs
      .map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }))
      .sort((a: any, b: any) => (b.mediaAvaliacao ?? 0) - (a.mediaAvaliacao ?? 0))
      .slice(0, 10);

    // Denúncias all
    const denunciasAll = denunciasAllSnap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));
    const denunciasCountByGestorId = denunciasAll.reduce<Record<string, number>>((acc: Record<string, number>, d: any) => {
      acc[d.gestorId] = (acc[d.gestorId] || 0) + 1;
      return acc;
    }, {});
    const topDenunciados = (Object.entries(denunciasCountByGestorId) as Array<[string, number]>)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Denúncias recentes (reusar denunciasAllSnap, evita query extra)
    const denunciasRecentesRaw = [...denunciasAll]
      .sort((a: any, b: any) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())
      .slice(0, 10);

    // Avaliações recentes
    const avaliacoesRecentesRaw = avaliacoesRecentesSnap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));

    // Buscar todos os IDs necessários e resolver em paralelo
    const topGestorIds = topGestoresRaw.map((g: any) => g.userId);
    const denunciadosGestorIds = topDenunciados.map(([gestorId]) => gestorId);
    const avalGestorIds = [...new Set(avaliacoesRecentesRaw.map((a: any) => a.gestorId).filter(Boolean))];
    const denRecGestorIds = [...new Set(denunciasRecentesRaw.map((d: any) => d.gestorId).filter(Boolean))];

    const [
      topGestoresUsersById,
      denunciadosGestoresById,
      avalGestoresById,
      denRecGestoresById
    ] = await Promise.all([
      getManyByIds<any>('users', topGestorIds),
      getManyByIds<any>('gestores', denunciadosGestorIds),
      getManyByIds<any>('gestores', avalGestorIds),
      getManyByIds<any>('gestores', denRecGestorIds)
    ]);

    // Buscar users dos gestores de denúncias, avaliações e denúncias recentes em paralelo
    const denunciadosUserIds = Object.values(denunciadosGestoresById).map((g: any) => (g as any).userId).filter(Boolean);
    const avalGestorUserIds = Object.values(avalGestoresById).map((g: any) => (g as any).userId).filter(Boolean);
    const avalAutorIds = avaliacoesRecentesRaw.map((a: any) => a.autorId).filter(Boolean);
    const denRecUserIds = Object.values(denRecGestoresById).map((g: any) => (g as any).userId).filter(Boolean);

    const [denunciadosUsersById, avalUsersById, denRecUsersById] = await Promise.all([
      getManyByIds<any>('users', denunciadosUserIds),
      getManyByIds<any>('users', [...new Set([...avalAutorIds, ...avalGestorUserIds])]),
      getManyByIds<any>('users', denRecUserIds)
    ]);

    // Montar resultados
    const topGestores = topGestoresRaw.map((g: any) => ({
      ...g,
      user: topGestoresUsersById[g.userId] ? { nome: (topGestoresUsersById[g.userId] as any).nome } : null
    }));

    const gestoresDenunciados = topDenunciados.map(([gestorId, total]) => {
      const gestor = denunciadosGestoresById[gestorId];
      const gestorUser = gestor ? denunciadosUsersById[(gestor as any).userId] : undefined;
      return {
        gestor: gestor ? { ...(gestor as any), user: gestorUser ? { nome: (gestorUser as any).nome } : null } : null,
        totalDenuncias: total
      };
    });

    const denunciasPorTipo = denunciasAll.reduce<Record<string, number>>((acc: Record<string, number>, d: any) => {
      acc[d.tipo] = (acc[d.tipo] || 0) + 1;
      return acc;
    }, {});

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

    const denunciasRecentes = denunciasRecentesRaw.map((d: any) => {
      const gestor = denRecGestoresById[d.gestorId];
      const gestorUser = gestor ? denRecUsersById[(gestor as any).userId] : undefined;
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
        mediaGeralAvaliacoes,
        totalDenuncias,
        denunciasPendentes,
        totalFeedbacksColaboradores
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
    const { tipo, formato = 'xlsx' } = req.query;

    let data: any[] = [];
    let filename = `${tipo}_export`;
    let sheetName = String(tipo || 'export');

    switch (tipo) {
      case 'avaliacoes':
        {
          const snap = await col('avaliacoes').get();
          const avaliacoes = snap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));
          const gestorIds = avaliacoes.map((a: any) => a.gestorId).filter(Boolean);
          const gestoresById = await getManyByIds<any>('gestores', gestorIds);
          const gestorUserIds = Object.values(gestoresById).map((g: any) => (g as any).userId).filter(Boolean);
          const usersById = await getManyByIds<any>('users', gestorUserIds);
          data = avaliacoes.map((a: any) => {
            const gestor = gestoresById[a.gestorId];
            const gestorUser = gestor ? usersById[(gestor as any).userId] : undefined;
            return {
              gestorNome: (gestorUser as any)?.nome || '',
              nota: a.nota ?? null,
              elogio: a.elogio ?? '',
              publica: a.publica ?? null
            };
          });
          filename = 'avaliacoes_export';
          sheetName = 'Avaliacoes';
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
              gestorNome: (gestorUser as any)?.nome || '',
              tipo: d.tipo ?? '',
              tipoManifestacao: d.tipoManifestacao ?? '',
              temas: Array.isArray(d.temas) ? d.temas.join(' | ') : '',
              descricao: d.descricao ?? '',
              descricaoComplementar: d.descricaoComplementar ?? '',
              frequencia: d.frequencia ?? '',
              impacto: d.impacto ?? '',
              envolvidos: d.envolvidos ?? '',
              comunicada: d.comunicada ?? '',
              desejaRetorno: d.desejaRetorno ?? '',
              declaracao: d.declaracao ?? null,
              anonima: d.anonima ?? null,
              nomeIdentificado: d.anonima ? '' : (d.nomeIdentificado ?? ''),
              setorIdentificado: d.anonima ? '' : (d.setorIdentificado ?? ''),
              status: d.status ?? ''
            };
          });
          filename = 'denuncias_export';
          sheetName = 'Denuncias';
        }
        break;
      case 'gestores':
        {
          const gestoresSnap = await col('gestores').get();
          const gestores = gestoresSnap.docs.map((d: any) => ({ id: d.id, ...(normalizeFirestoreData(d.data()) as any) }));
          const usersById = await getManyByIds<any>('users', gestores.map((g: any) => g.userId));
          data = gestores.map((g: any) => {
            const user = usersById[g.userId];
            const row: any = { ...g };
            delete row.id;
            delete row.foto;
            delete row.userId;
            return {
              gestorNome: (user as any)?.nome || '',
              ...row
            };
          });
          filename = 'gestores_export';
          sheetName = 'Gestores';
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

    if (formato === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);

      if (data.length > 0) {
        const keys = Object.keys(data[0]);
        worksheet.columns = keys.map((key) => ({
          header: key,
          key,
          width: Math.min(60, Math.max(12, key.length + 2))
        }));
        worksheet.addRows(
          data.map((row: any) => {
            const normalized: any = {};
            for (const key of keys) {
              const v = row[key];
              normalized[key] = v instanceof Date ? v.toISOString() : v ?? '';
            }
            return normalized;
          })
        );
        worksheet.getRow(1).font = { bold: true };
      }

      const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
      return res.send(Buffer.from(buffer));
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao exportar dados' });
  }
});

export default router;
