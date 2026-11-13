import { col } from '../firestoreRepo';

// Um admin (RH_ADMIN) também pode ser denunciado: admins têm perfil de gestor (para
// receber os avisos no Slack) e aparecem como colaboradores pelo Slack ID. Quem é
// denunciado não pode ver, responder, mudar o status nem baixar as provas da própria
// denúncia — do mesmo jeito que já não recebe o aviso no Slack.

interface Identidade {
  gestorIds: Set<string>;
  slackIds: Set<string>;
  expiraEm: number;
}

const cache = new Map<string, Identidade>();
const CACHE_TTL_MS = 60_000;

async function identidadeDoUsuario(userId: string): Promise<Identidade> {
  const emCache = cache.get(userId);
  if (emCache && emCache.expiraEm > Date.now()) return emCache;

  const snap = await col('gestores').where('userId', '==', userId).get();
  const identidade: Identidade = {
    gestorIds: new Set(snap.docs.map((d) => d.id)),
    slackIds: new Set(snap.docs.map((d) => d.get('slackUserId')).filter(Boolean)),
    expiraEm: Date.now() + CACHE_TTL_MS
  };
  cache.set(userId, identidade);
  return identidade;
}

function envolve(denuncia: { gestorId?: string | null; colaboradorSlackId?: string | null }, identidade: Identidade) {
  return (
    (!!denuncia.gestorId && identidade.gestorIds.has(denuncia.gestorId)) ||
    (!!denuncia.colaboradorSlackId && identidade.slackIds.has(denuncia.colaboradorSlackId))
  );
}

/** true se o usuário é a pessoa denunciada nesta denúncia */
export async function usuarioEhDenunciado(
  userId: string,
  denuncia: { gestorId?: string | null; colaboradorSlackId?: string | null }
): Promise<boolean> {
  return envolve(denuncia, await identidadeDoUsuario(userId));
}

/** Remove da lista as denúncias contra o próprio usuário */
export async function semDenunciasContraOUsuario<T extends { gestorId?: string | null; colaboradorSlackId?: string | null }>(
  userId: string,
  denuncias: T[]
): Promise<T[]> {
  const identidade = await identidadeDoUsuario(userId);
  return denuncias.filter((d) => !envolve(d, identidade));
}
