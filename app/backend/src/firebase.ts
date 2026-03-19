import admin from 'firebase-admin';

function assertEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value;
}

type ServiceAccountFromEnv = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function getServiceAccountFromEnv(): ServiceAccountFromEnv {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    const parsed = JSON.parse(json) as any;
    const projectId = parsed.project_id || parsed.projectId;
    const clientEmail = parsed.client_email || parsed.clientEmail;
    const privateKey = parsed.private_key || parsed.privateKey;
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON inválido: campos obrigatórios ausentes');
    }
    return {
      projectId,
      clientEmail,
      privateKey: String(privateKey).replace(/\\n/g, '\n')
    };
  }

  return {
    projectId: assertEnv('FIREBASE_PROJECT_ID'),
    clientEmail: assertEnv('FIREBASE_CLIENT_EMAIL'),
    privateKey: assertEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n')
  };
}

export function getFirebaseAdminApp() {
  if (admin.apps.length) {
    return admin.app();
  }

  const { projectId, clientEmail, privateKey } = getServiceAccountFromEnv();

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey
    })
  });

  return admin.app();
}

export function getFirestore() {
  getFirebaseAdminApp();
  const db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

export const firestore = getFirestore();
export const { FieldValue } = admin.firestore;
export const { Timestamp } = admin.firestore;
