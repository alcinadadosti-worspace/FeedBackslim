import { v4 as uuidv4 } from 'uuid';
import { firestore } from '../firebase';
import { docRef, normalizeFirestoreData, snapData } from '../firestoreRepo';

// Histórico da denúncia: comentários do RH para o denunciante e mudanças de status.
// Cada item é guardado separado (denuncias/{id}/historico/{itemId}), então nada se perde
// quando o RH escreve um comentário novo ou muda o status de novo.

export type TipoHistorico = 'COMENTARIO' | 'STATUS';

export interface ItemHistorico {
  id: string;
  tipo: TipoHistorico;
  texto: string;
  autorUserId: string | null;
  autorNome: string | null;
  createdAt: Date;
}

export const MAX_CARACTERES_COMENTARIO = 5000;

function historicoCol(denunciaId: string) {
  return firestore.collection('denuncias').doc(denunciaId).collection('historico');
}

export async function obterNomeUsuario(userId: string): Promise<string | null> {
  const user = snapData<any>((await docRef('users', userId).get()) as any);
  return user?.nome || null;
}

export async function registrarNoHistorico(
  denunciaId: string,
  item: { tipo: TipoHistorico; texto: string; autorUserId: string }
): Promise<ItemHistorico> {
  const registro: ItemHistorico = {
    id: uuidv4(),
    tipo: item.tipo,
    texto: item.texto,
    autorUserId: item.autorUserId,
    autorNome: await obterNomeUsuario(item.autorUserId),
    createdAt: new Date()
  };
  await historicoCol(denunciaId).doc(registro.id).set(registro);
  return registro;
}

export async function listarHistorico(denunciaId: string): Promise<ItemHistorico[]> {
  const snap = await historicoCol(denunciaId).orderBy('createdAt', 'asc').get();
  return snap.docs.map((d) => normalizeFirestoreData(d.data()) as ItemHistorico);
}

// O denunciante vê apenas "RH", nunca o nome de quem escreveu
export function historicoParaDenunciante(item: ItemHistorico) {
  return { id: item.id, tipo: item.tipo, texto: item.texto, createdAt: item.createdAt };
}

export function historicoParaRH(item: ItemHistorico) {
  return { id: item.id, tipo: item.tipo, texto: item.texto, autorNome: item.autorNome, createdAt: item.createdAt };
}
