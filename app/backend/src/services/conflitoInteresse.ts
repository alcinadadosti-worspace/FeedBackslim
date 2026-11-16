import { col, docRef } from '../firestoreRepo';
import { algumNomeCorresponde, nomesDosDenunciados, PessoaDenunciada } from './nomes';

// Um admin (RH_ADMIN) também pode ser denunciado: admins têm perfil de gestor (para
// receber os avisos no Slack) e aparecem como colaboradores pelo Slack ID. Quem é
// denunciado não pode ver, responder, mudar o status nem baixar as provas da própria
// denúncia — do mesmo jeito que já não recebe o aviso no Slack.
//
// Denúncias antigas apontam a pessoa pelo ID (gestor ou Slack). Nas novas, a pessoa é
// digitada (nome, cargo e setor), então a comparação é pelo nome.

interface Identidade {
  gestorIds: Set<string>;
  slackIds: Set<string>;
  nome: string | null;
  expiraEm: number;
}

type DenunciaComPessoas = {
  gestorId?: string | null;
  colaboradorSlackId?: string | null;
  denunciados?: PessoaDenunciada[] | null;
};

const cache = new Map<string, Identidade>();
const CACHE_TTL_MS = 60_000;

async function identidadeDoUsuario(userId: string): Promise<Identidade> {
  const emCache = cache.get(userId);
  if (emCache && emCache.expiraEm > Date.now()) return emCache;

  const [snap, userSnap] = await Promise.all([
    col('gestores').where('userId', '==', userId).get(),
    docRef('users', userId).get()
  ]);
  const identidade: Identidade = {
    gestorIds: new Set(snap.docs.map((d) => d.id)),
    slackIds: new Set(snap.docs.map((d) => d.get('slackUserId')).filter(Boolean)),
    nome: userSnap.exists ? (userSnap.get('nome') as string) || null : null,
    expiraEm: Date.now() + CACHE_TTL_MS
  };
  cache.set(userId, identidade);
  return identidade;
}

function envolve(denuncia: DenunciaComPessoas, identidade: Identidade) {
  return (
    (!!denuncia.gestorId && identidade.gestorIds.has(denuncia.gestorId)) ||
    (!!denuncia.colaboradorSlackId && identidade.slackIds.has(denuncia.colaboradorSlackId)) ||
    (!!identidade.nome && algumNomeCorresponde(nomesDosDenunciados(denuncia), identidade.nome))
  );
}

/** true se o usuário é a pessoa denunciada nesta denúncia */
export async function usuarioEhDenunciado(userId: string, denuncia: DenunciaComPessoas): Promise<boolean> {
  return envolve(denuncia, await identidadeDoUsuario(userId));
}

/** Remove da lista as denúncias contra o próprio usuário */
export async function semDenunciasContraOUsuario<T extends DenunciaComPessoas>(userId: string, denuncias: T[]): Promise<T[]> {
  const identidade = await identidadeDoUsuario(userId);
  return denuncias.filter((d) => !envolve(d, identidade));
}
