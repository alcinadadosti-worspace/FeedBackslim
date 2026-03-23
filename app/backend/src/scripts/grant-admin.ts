/**
 * Script one-shot: promove usuários para RH_ADMIN no Firestore.
 * Uso (de dentro de app/backend): npx tsx src/scripts/grant-admin.ts
 */

// Carregar dotenv ANTES de qualquer import que use process.env
import { config } from 'dotenv';
config({ path: '.env' });

import admin from 'firebase-admin';

const EMAILS_TO_PROMOTE = [
  'fernando@cpalcina.com',
  'luiz@cpalcina.com',
];

async function main() {
  // Inicializar Firebase com qualquer uma das formas suportadas pelo projeto
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  let credential: admin.credential.Credential;

  if (json) {
    const sa = JSON.parse(json);
    credential = admin.credential.cert(sa);
  } else if (projectId && clientEmail && privateKey) {
    credential = admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    });
  } else {
    console.error('Nenhuma credencial Firebase encontrada. Verifique o .env');
    console.error('Vars disponíveis:', Object.keys(process.env).filter(k => k.startsWith('FIREBASE')));
    process.exit(1);
  }

  admin.initializeApp({ credential });
  const db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });

  const snap = await db
    .collection('users')
    .where('email', 'in', EMAILS_TO_PROMOTE)
    .get();

  if (snap.empty) {
    console.log('Nenhum usuário encontrado com os e-mails informados.');
    process.exit(0);
  }

  for (const doc of snap.docs) {
    const user = doc.data();
    const prev = user.role;
    await doc.ref.update({ role: 'RH_ADMIN', updatedAt: new Date() });
    console.log(`✓ ${user.email}  ${prev} → RH_ADMIN`);
  }

  const notFound = EMAILS_TO_PROMOTE.filter(
    (e) => !snap.docs.some((d) => d.data().email === e)
  );
  if (notFound.length) {
    console.warn('Não encontrados no Firestore:', notFound.join(', '));
  }

  console.log('Concluído.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
