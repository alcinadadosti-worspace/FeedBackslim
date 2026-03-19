import type { CollectionReference, DocumentData, DocumentReference, DocumentSnapshot } from 'firebase-admin/firestore';
import { firestore } from './firebase';

export function col<T = DocumentData>(name: string) {
  return firestore.collection(name) as CollectionReference<T>;
}

export function docRef<T = DocumentData>(name: string, id: string) {
  return col<T>(name).doc(id) as DocumentReference<T>;
}

export function toDate(value: unknown): Date | unknown {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate();
  }
  return value;
}

export function normalizeFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map((v) => normalizeFirestoreData(v)) as any;
  }
  if (typeof data === 'object') {
    const converted = toDate(data);
    if (converted !== data) {
      return converted as any;
    }
    const obj: any = {};
    for (const [k, v] of Object.entries(data as any)) {
      obj[k] = normalizeFirestoreData(v);
    }
    return obj;
  }
  return data;
}

export function snapData<T>(snap: DocumentSnapshot<T>): (T & { id: string }) | null {
  if (!snap.exists) return null;
  const raw = snap.data() as any;
  const normalized = normalizeFirestoreData(raw) as T;
  return { ...(normalized as any), id: snap.id };
}

export async function getManyByIds<T>(
  collectionName: string,
  ids: string[]
): Promise<Record<string, (T & { id: string })>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};
  const refs = unique.map((id) => docRef<any>(collectionName, id) as DocumentReference<DocumentData>);
  const snaps = await firestore.getAll(...refs);
  const out: Record<string, (T & { id: string })> = {};
  for (const s of snaps) {
    const data = snapData<T>(s as any);
    if (data) out[data.id] = data;
  }
  return out;
}
