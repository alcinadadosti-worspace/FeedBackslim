// Regras das provas (fotos e vídeos) anexadas à denúncia.
// Mesmos limites e tipos do backend (app/backend/src/services/anexoStorage.ts).

export const MAX_BYTES_POR_PROVA = 30 * 1024 * 1024; // 30 MB
export const MAX_PROVAS_POR_DENUNCIA = 10;
export const MAX_BYTES_PROVAS_POR_DENUNCIA = 150 * 1024 * 1024; // 150 MB

const MIMES_ACEITOS = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
  'video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/x-matroska', 'video/x-msvideo', 'video/mpeg',
]);

const EXTENSOES_ACEITAS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif',
  '.mp4', '.mov', '.webm', '.3gp', '.3gpp', '.mkv', '.avi', '.mpeg', '.mpg',
]);

export const ACCEPT_PROVAS = Array.from(EXTENSOES_ACEITAS).join(',') + ',image/*,video/*';

export function provaPermitida(arquivo: File) {
  if (MIMES_ACEITOS.has((arquivo.type || '').toLowerCase())) return true;
  const extensao = arquivo.name.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
  return EXTENSOES_ACEITAS.has(extensao);
}

export function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
