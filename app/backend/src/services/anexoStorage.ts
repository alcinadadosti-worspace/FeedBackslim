import path from 'path';
import { firestore } from '../firebase';
import { normalizeFirestoreData } from '../firestoreRepo';

// Provas (fotos e vídeos) enviadas pelo denunciante ao registrar a denúncia.
//
// Os arquivos ficam no próprio Firestore, divididos em pedaços, para funcionar no plano
// gratuito do Firebase (o Firebase Storage exige plano pago e o disco do Render é apagado
// a cada deploy):
//   denuncias/{denunciaId}/anexos/{anexoId}                 -> metadados
//   denuncias/{denunciaId}/anexos/{anexoId}/chunks/{0000}   -> pedaços de até 900 KB

export const MAX_BYTES_POR_ARQUIVO = 30 * 1024 * 1024; // 30 MB
export const MAX_ANEXOS_POR_DENUNCIA = 10;
export const MAX_BYTES_POR_DENUNCIA = 150 * 1024 * 1024; // 150 MB somando as provas de uma denúncia
// Teto para todas as provas do sistema juntas, para não lotar o Firestore (o plano gratuito tem 1 GB).
// Ajustável pela variável de ambiente ANEXOS_LIMITE_TOTAL_MB.
export const MAX_BYTES_TOTAL = (Number(process.env.ANEXOS_LIMITE_TOTAL_MB) || 700) * 1024 * 1024;

// Um documento do Firestore aceita no máximo 1 MiB; 900 KB deixa folga para os demais campos.
const CHUNK_SIZE = 900 * 1024;
// Cada commit do Firestore aceita no máximo 10 MiB, então gravamos poucos pedaços por vez.
const CHUNKS_POR_BATCH = 8;
// Pedaços lidos de uma vez ao enviar o arquivo (limita a memória usada por download).
const CHUNKS_POR_LEITURA = 2;

export type CategoriaAnexo = 'IMAGEM' | 'VIDEO';

const TIPOS_PERMITIDOS: Record<string, CategoriaAnexo> = {
  'image/jpeg': 'IMAGEM',
  'image/jpg': 'IMAGEM',
  'image/png': 'IMAGEM',
  'image/gif': 'IMAGEM',
  'image/webp': 'IMAGEM',
  'image/heic': 'IMAGEM',
  'image/heif': 'IMAGEM',
  'video/mp4': 'VIDEO',
  'video/quicktime': 'VIDEO',
  'video/webm': 'VIDEO',
  'video/3gpp': 'VIDEO',
  'video/x-matroska': 'VIDEO',
  'video/x-msvideo': 'VIDEO',
  'video/mpeg': 'VIDEO'
};

// Alguns navegadores não informam o tipo de arquivos como .heic ou .mov
const TIPO_POR_EXTENSAO: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.3gp': 'video/3gpp',
  '.3gpp': 'video/3gpp',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mpeg': 'video/mpeg',
  '.mpg': 'video/mpeg'
};

export interface AnexoResumo {
  id: string;
  nome: string;
  mimeType: string;
  tamanho: number;
  categoria: CategoriaAnexo;
  createdAt?: Date;
}

interface AnexoMeta extends AnexoResumo {
  denunciaId: string;
  totalChunks: number;
  completo: boolean;
  createdAt: Date;
}

export function resolverTipoArquivo(nomeOriginal: string, mimeInformado: string): { mimeType: string; categoria: CategoriaAnexo } | null {
  let mimeType = (mimeInformado || '').toLowerCase();
  if (!TIPOS_PERMITIDOS[mimeType]) {
    // O navegador não soube dizer o tipo (ou usou um nome alternativo): vale a extensão.
    // É seguro porque o arquivo sempre volta com um tipo da lista permitida.
    const porExtensao = TIPO_POR_EXTENSAO[path.extname(nomeOriginal || '').toLowerCase()];
    if (porExtensao) mimeType = porExtensao;
  }
  const categoria = TIPOS_PERMITIDOS[mimeType];
  return categoria ? { mimeType, categoria } : null;
}

function anexosCol(denunciaId: string) {
  return firestore.collection('denuncias').doc(denunciaId).collection('anexos');
}

function chunkId(index: number) {
  return String(index).padStart(4, '0');
}

export async function salvarAnexo(
  denunciaId: string,
  anexoId: string,
  buffer: Buffer,
  info: { nome: string; mimeType: string; categoria: CategoriaAnexo }
): Promise<AnexoResumo> {
  const ref = anexosCol(denunciaId).doc(anexoId);
  const totalChunks = Math.max(1, Math.ceil(buffer.length / CHUNK_SIZE));

  try {
    for (let inicio = 0; inicio < totalChunks; inicio += CHUNKS_POR_BATCH) {
      const batch = firestore.batch();
      const fim = Math.min(inicio + CHUNKS_POR_BATCH, totalChunks);
      for (let i = inicio; i < fim; i++) {
        batch.set(ref.collection('chunks').doc(chunkId(i)), {
          index: i,
          data: buffer.subarray(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
        });
      }
      await batch.commit();
    }

    // Metadados por último: o anexo só passa a existir quando todos os pedaços foram gravados
    const createdAt = new Date();
    const resumo: AnexoResumo = {
      id: anexoId,
      nome: info.nome,
      mimeType: info.mimeType,
      tamanho: buffer.length,
      categoria: info.categoria,
      createdAt
    };
    await ref.set({ ...resumo, denunciaId, totalChunks, completo: true });
    return resumo;
  } catch (error) {
    // Remove pedaços gravados pela metade para não ocupar espaço à toa
    await firestore.recursiveDelete(ref).catch(() => undefined);
    throw error;
  }
}

export async function listarAnexos(denunciaId: string): Promise<AnexoResumo[]> {
  const snap = await anexosCol(denunciaId).get();
  return snap.docs
    .map((d) => normalizeFirestoreData(d.data()) as AnexoMeta)
    .filter((a) => a.completo)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(({ id, nome, mimeType, tamanho, categoria, createdAt }) => ({ id, nome, mimeType, tamanho, categoria, createdAt }));
}

export async function obterAnexo(denunciaId: string, anexoId: string): Promise<AnexoMeta | null> {
  const snap = await anexosCol(denunciaId).doc(anexoId).get();
  if (!snap.exists) return null;
  const meta = normalizeFirestoreData(snap.data()) as AnexoMeta;
  if (!meta.completo || meta.denunciaId !== denunciaId) return null;
  return meta;
}

export async function* lerPedacosDoAnexo(denunciaId: string, anexoId: string, totalChunks: number): AsyncGenerator<Buffer> {
  const ref = anexosCol(denunciaId).doc(anexoId);
  for (let inicio = 0; inicio < totalChunks; inicio += CHUNKS_POR_LEITURA) {
    const fim = Math.min(inicio + CHUNKS_POR_LEITURA, totalChunks);
    const refs = [];
    for (let i = inicio; i < fim; i++) refs.push(ref.collection('chunks').doc(chunkId(i)));
    const snaps = await firestore.getAll(...refs);
    for (const snap of snaps) {
      const data = snap.exists ? snap.get('data') : null;
      if (!data) throw new Error(`Pedaço ausente no anexo ${anexoId}`);
      yield Buffer.isBuffer(data) ? data : Buffer.from(data);
    }
  }
}
