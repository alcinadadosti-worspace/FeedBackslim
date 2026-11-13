import path from 'path';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { firestore, FieldValue } from '../firebase';
import { docRef } from '../firestoreRepo';
import {
  AnexoResumo,
  MAX_ANEXOS_POR_DENUNCIA,
  MAX_BYTES_POR_DENUNCIA,
  MAX_BYTES_TOTAL,
  resolverTipoArquivo,
  salvarAnexo
} from './anexoStorage';

// Provas enviadas pelo denunciante logo depois de registrar a denúncia.
// Ao criar a denúncia, ele recebe um token curto que só serve para anexar arquivos àquela
// denúncia. Depois que o token expira, não dá mais para enviar provas.

export class ProvaError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Token de envio de provas
// O "audience" impede que ele seja aceito como login de usuário (e vice-versa).
// ---------------------------------------------------------------------------
const AUDIENCE_PROVAS = 'denuncia-anexos';
const VALIDADE_TOKEN_PROVAS = '1h';

function jwtSecret() {
  return process.env.JWT_SECRET || 'ouvidoria-secret';
}

export function gerarTokenProvas(denunciaId: string): string {
  return jwt.sign({ denunciaId }, jwtSecret(), { audience: AUDIENCE_PROVAS, expiresIn: VALIDADE_TOKEN_PROVAS });
}

export function validarTokenProvas(token: string): string | null {
  try {
    const decoded = jwt.verify(token, jwtSecret(), { audience: AUDIENCE_PROVAS }) as any;
    return typeof decoded?.denunciaId === 'string' ? decoded.denunciaId : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Espaço: reservado numa transação antes de gravar o arquivo, para que envios
// simultâneos não passem dos limites da denúncia nem do limite geral
// ---------------------------------------------------------------------------
const usoGlobalRef = () => docRef('sistema', 'anexosDenuncias');

async function reservarEspaco(denunciaId: string, bytes: number) {
  const denunciaRef = docRef('denuncias', denunciaId);
  await firestore.runTransaction(async (t) => {
    const [denunciaSnap, globalSnap] = await Promise.all([t.get(denunciaRef), t.get(usoGlobalRef())]);
    if (!denunciaSnap.exists) throw new ProvaError(404, 'Denúncia não encontrada');
    const quantidade = Number(denunciaSnap.get('anexosCount') || 0);
    const usadoDenuncia = Number(denunciaSnap.get('anexosBytes') || 0);
    const usadoGlobal = Number(globalSnap.get('totalBytes') || 0);
    if (quantidade >= MAX_ANEXOS_POR_DENUNCIA) {
      throw new ProvaError(400, `Limite de ${MAX_ANEXOS_POR_DENUNCIA} arquivos por denúncia atingido.`);
    }
    if (usadoDenuncia + bytes > MAX_BYTES_POR_DENUNCIA) {
      throw new ProvaError(400, `Limite de ${Math.round(MAX_BYTES_POR_DENUNCIA / 1048576)} MB em provas por denúncia atingido.`);
    }
    if (usadoGlobal + bytes > MAX_BYTES_TOTAL) {
      throw new ProvaError(507, 'O espaço para provas está cheio no momento. Descreva a prova no texto da denúncia.');
    }
    t.set(denunciaRef, { anexosCount: quantidade + 1, anexosBytes: usadoDenuncia + bytes }, { merge: true });
    t.set(usoGlobalRef(), { totalBytes: usadoGlobal + bytes, atualizadoEm: new Date() }, { merge: true });
  });
}

async function liberarEspaco(denunciaId: string, bytes: number) {
  await Promise.all([
    docRef('denuncias', denunciaId).set(
      { anexosCount: FieldValue.increment(-1), anexosBytes: FieldValue.increment(-bytes) },
      { merge: true }
    ),
    usoGlobalRef().set({ totalBytes: FieldValue.increment(-bytes) }, { merge: true })
  ]).catch((error) => console.error('Erro ao liberar espaço de prova:', error));
}

// O nome original do arquivo pode identificar o denunciante (ex.: "IMG - João.jpg"),
// então as provas são guardadas com um nome neutro
const formatoNomeArquivo = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
});
function nomeNeutro(nomeOriginal: string): string {
  const p = Object.fromEntries(formatoNomeArquivo.formatToParts(new Date()).map((x) => [x.type, x.value]));
  const extensao = path.extname(nomeOriginal || '').toLowerCase();
  const extSegura = /^\.[a-z0-9]{1,6}$/.test(extensao) ? extensao : '';
  return `prova-${p.year}-${p.month}-${p.day}-${p.hour}${p.minute}${p.second}${extSegura}`;
}

export async function salvarProva(
  denunciaId: string,
  arquivo: { buffer: Buffer; originalname: string; mimetype: string; size: number }
): Promise<AnexoResumo> {
  const tipo = resolverTipoArquivo(arquivo.originalname, arquivo.mimetype);
  if (!tipo) throw new ProvaError(400, 'Tipo de arquivo não permitido. Envie fotos ou vídeos.');
  if (!arquivo.size) throw new ProvaError(400, 'O arquivo está vazio');

  await reservarEspaco(denunciaId, arquivo.size);
  try {
    return await salvarAnexo(denunciaId, uuidv4(), arquivo.buffer, {
      nome: nomeNeutro(arquivo.originalname),
      ...tipo
    });
  } catch (error) {
    await liberarEspaco(denunciaId, arquivo.size);
    throw error;
  }
}
