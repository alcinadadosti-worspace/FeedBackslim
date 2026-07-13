import { Colaborador } from './models';
import { COLABORADORES } from './data/colaboradores';
import { col, docRef } from './firestoreRepo';

const COLLECTION = 'colaboradores';

// A lista base (hardcoded em ./data/colaboradores) funciona como seed e rede de
// segurança: os colaboradores atuais continuam existindo mesmo sem nada no banco.
// As alterações feitas pelo app (adicionar/remover/renomear) ficam no Firestore,
// na coleção `colaboradores`, usando o Slack ID como ID do documento.
// Formato do doc: { slackId, nome, removed?: boolean, createdAt, updatedAt }.
const baseBySlackId = new Map<string, string>(COLABORADORES.map((c) => [c.slackId, c.nome]));

export function sortColaboradores(list: Colaborador[]): Colaborador[] {
  return [...list].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// Lista efetiva = base do código sobreposta pelos deltas do Firestore.
// Um doc com `removed: true` remove o colaborador; qualquer outro doc adiciona
// ou sobrescreve o nome (usando o Slack ID como chave).
export async function listColaboradores(): Promise<Colaborador[]> {
  const snap = await col(COLLECTION).get();
  const map = new Map<string, string>(baseBySlackId);

  for (const doc of snap.docs) {
    const data = doc.data() as { nome?: string; removed?: boolean };
    if (data?.removed === true) {
      map.delete(doc.id);
    } else if (data?.nome) {
      map.set(doc.id, data.nome);
    }
  }

  const list = Array.from(map, ([slackId, nome]) => ({ slackId, nome }));
  return sortColaboradores(list);
}

// Busca um colaborador ativo pelo Slack ID (respeita remoções via tombstone).
// Faz uma única leitura de documento (barato) e cai para a base se não houver delta.
export async function findColaboradorBySlackId(slackId: string): Promise<Colaborador | null> {
  const snap = await docRef(COLLECTION, slackId).get();
  if (snap.exists) {
    const data = snap.data() as { nome?: string; removed?: boolean };
    if (data?.removed === true) return null;
    if (data?.nome) return { slackId, nome: data.nome };
  }
  const nome = baseBySlackId.get(slackId);
  return nome ? { slackId, nome } : null;
}

// Adiciona (ou reativa) um colaborador no Firestore.
export async function addColaborador(input: { slackId: string; nome: string }): Promise<Colaborador> {
  const slackId = input.slackId.trim();
  const nome = input.nome.trim();
  const now = new Date();
  await docRef(COLLECTION, slackId).set({
    slackId,
    nome,
    removed: false,
    createdAt: now,
    updatedAt: now,
  });
  return { slackId, nome };
}

// Remove um colaborador. Se for da base (código), grava um "tombstone"
// (removed: true) para excluí-lo da lista; se foi adicionado pelo app, apaga o doc.
export async function removeColaborador(slackId: string): Promise<void> {
  const now = new Date();
  if (baseBySlackId.has(slackId)) {
    await docRef(COLLECTION, slackId).set({
      slackId,
      nome: baseBySlackId.get(slackId),
      removed: true,
      updatedAt: now,
    });
  } else {
    await docRef(COLLECTION, slackId).delete();
  }
}
