import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { firestore } from '../src/firebase';
import { BadgeType, Role, StatusDenuncia, TipoDenuncia } from '../src/models';

dotenv.config();

async function clearCollection(name: string) {
  const collectionRef = firestore.collection(name);
  const snap = await collectionRef.get();
  if (snap.empty) return;

  let batch = firestore.batch();
  let count = 0;

  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    count++;
    if (count === 450) {
      await batch.commit();
      batch = firestore.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }
}

async function main() {
  console.log('🌱 Iniciando seed do Firestore...');

  await clearCollection('badges');
  await clearCollection('avaliacoes');
  await clearCollection('denuncias');
  await clearCollection('gestores');
  await clearCollection('users');

  const hashedPassword = await bcrypt.hash('123456', 10);
  const now = new Date();

  const adminUserId = uuidv4();
  await firestore.collection('users').doc(adminUserId).set({
    id: adminUserId,
    email: 'admin@pulse360.com',
    password: hashedPassword,
    nome: 'Administrador RH',
    role: Role.RH_ADMIN,
    avatar: null,
    createdAt: now,
    updatedAt: now
  });

  console.log('✅ Usuário Admin criado: admin@pulse360.com');

  const gestores = [
    {
      email: 'carlos.silva@pulse360.com',
      nome: 'Carlos Silva',
      cargo: 'Diretor de Tecnologia',
      departamento: 'Tecnologia',
      bio: 'Líder experiente com mais de 15 anos no mercado de tecnologia.'
    },
    {
      email: 'ana.santos@pulse360.com',
      nome: 'Ana Santos',
      cargo: 'Gerente de Produto',
      departamento: 'Produto',
      bio: 'Especialista em gestão de produtos digitais e metodologias ágeis.'
    },
    {
      email: 'roberto.lima@pulse360.com',
      nome: 'Roberto Lima',
      cargo: 'Gerente de Operações',
      departamento: 'Operações',
      bio: 'Focado em eficiência operacional e melhoria contínua.'
    },
    {
      email: 'patricia.costa@pulse360.com',
      nome: 'Patricia Costa',
      cargo: 'Diretora de Marketing',
      departamento: 'Marketing',
      bio: 'Especialista em marketing digital e branding.'
    },
    {
      email: 'fernando.oliveira@pulse360.com',
      nome: 'Fernando Oliveira',
      cargo: 'Gerente de Vendas',
      departamento: 'Comercial',
      bio: 'Profissional com vasta experiência em vendas B2B.'
    }
  ];

  const gestoresCreated: Array<{ userId: string; gestorId: string; nome: string }> = [];

  for (const g of gestores) {
    const userId = uuidv4();
    await firestore.collection('users').doc(userId).set({
      id: userId,
      email: g.email,
      password: hashedPassword,
      nome: g.nome,
      role: Role.GESTOR,
      avatar: null,
      createdAt: now,
      updatedAt: now
    });

    const gestorId = uuidv4();
    await firestore.collection('gestores').doc(gestorId).set({
      id: gestorId,
      userId,
      cargo: g.cargo,
      departamento: g.departamento,
      bio: g.bio,
      foto: null,
      slackUserId: null,
      mediaAvaliacao: 0,
      totalAvaliacoes: 0,
      elogiosCount: 0,
      sugestoesCount: 0,
      criticasCount: 0,
      createdAt: now,
      updatedAt: now
    });

    gestoresCreated.push({ userId, gestorId, nome: g.nome });
    console.log('✅ Gestor criado:', g.nome);
  }

  const colaboradores = [
    { email: 'joao.pereira@pulse360.com', nome: 'João Pereira' },
    { email: 'maria.souza@pulse360.com', nome: 'Maria Souza' },
    { email: 'lucas.almeida@pulse360.com', nome: 'Lucas Almeida' },
    { email: 'juliana.ferreira@pulse360.com', nome: 'Juliana Ferreira' },
    { email: 'pedro.santos@pulse360.com', nome: 'Pedro Santos' },
    { email: 'camila.rodrigues@pulse360.com', nome: 'Camila Rodrigues' },
    { email: 'rafael.costa@pulse360.com', nome: 'Rafael Costa' },
    { email: 'amanda.lima@pulse360.com', nome: 'Amanda Lima' }
  ];

  const colaboradoresCreated: Array<{ userId: string; nome: string }> = [];

  for (const c of colaboradores) {
    const userId = uuidv4();
    await firestore.collection('users').doc(userId).set({
      id: userId,
      email: c.email,
      password: hashedPassword,
      nome: c.nome,
      role: Role.COLABORADOR,
      avatar: null,
      createdAt: now,
      updatedAt: now
    });
    colaboradoresCreated.push({ userId, nome: c.nome });
    console.log('✅ Colaborador criado:', c.nome);
  }

  const elogios = [
    'Excelente líder! Sempre disponível para ajudar a equipe.',
    'Muito comunicativo e transparente com os objetivos.',
    'Inspira a equipe a dar o melhor de si.',
    'Ótimo em dar feedback construtivo.',
    'Sempre reconhece o trabalho bem feito.',
    'Cria um ambiente de trabalho muito positivo.'
  ];

  const sugestoes = [
    'Poderia realizar mais reuniões one-on-one.',
    'Seria bom ter mais clareza nas prioridades.',
    'Sugiro mais autonomia para a equipe.',
    'Reuniões mais objetivas seriam bem-vindas.'
  ];

  const criticas = [
    'Às vezes demora para responder mensagens importantes.',
    'Precisa melhorar a comunicação sobre mudanças de projeto.',
    'Feedback poderia ser mais frequente.'
  ];

  console.log('\n📝 Criando avaliações...');

  for (const gestor of gestoresCreated) {
    const numAvaliacoes = Math.floor(Math.random() * 8) + 5;

    let somaNotas = 0;
    let total = 0;
    let elogiosCount = 0;
    let sugestoesCount = 0;
    let criticasCount = 0;

    for (let i = 0; i < numAvaliacoes; i++) {
      const colaborador = colaboradoresCreated[Math.floor(Math.random() * colaboradoresCreated.length)];
      const nota = Math.floor(Math.random() * 4) + 7;

      const hasElogio = Math.random() > 0.3;
      const hasSugestao = Math.random() > 0.6;
      const hasCritica = Math.random() > 0.8;

      const createdAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
      const avaliacaoId = uuidv4();
      await firestore.collection('avaliacoes').doc(avaliacaoId).set({
        id: avaliacaoId,
        gestorId: gestor.gestorId,
        autorId: colaborador.userId,
        nota,
        elogio: hasElogio ? elogios[Math.floor(Math.random() * elogios.length)] : null,
        sugestao: hasSugestao ? sugestoes[Math.floor(Math.random() * sugestoes.length)] : null,
        critica: hasCritica ? criticas[Math.floor(Math.random() * criticas.length)] : null,
        createdAt
      });

      somaNotas += nota;
      total++;
      if (hasElogio) elogiosCount++;
      if (hasSugestao) sugestoesCount++;
      if (hasCritica) criticasCount++;
    }

    const media = total === 0 ? 0 : somaNotas / total;
    await firestore.collection('gestores').doc(gestor.gestorId).set(
      {
        mediaAvaliacao: Number(media.toFixed(1)),
        totalAvaliacoes: total,
        elogiosCount,
        sugestoesCount,
        criticasCount,
        updatedAt: new Date()
      },
      { merge: true }
    );

    console.log(`  ✅ ${gestor.nome}: ${total} avaliações, média ${media.toFixed(1)}`);
  }

  console.log('\n🚨 Criando denúncias de exemplo...');

  const tiposDenuncia = [TipoDenuncia.COMPORTAMENTO_INADEQUADO, TipoDenuncia.ASSEDIO_MORAL, TipoDenuncia.ABUSO_AUTORIDADE];
  const descricoesDenuncia = [
    'Comportamento agressivo em reunião de equipe.',
    'Comentários inapropriados sobre aparência de colaboradores.',
    'Pressão excessiva para cumprimento de metas irrealistas.',
    'Favoritismo na distribuição de tarefas e promoções.'
  ];

  for (let i = 0; i < 3; i++) {
    const gestor = gestoresCreated[Math.floor(Math.random() * gestoresCreated.length)];
    const colaborador = colaboradoresCreated[Math.floor(Math.random() * colaboradoresCreated.length)];
    const anonima = Math.random() > 0.5;
    const denunciaId = uuidv4();
    const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

    await firestore.collection('denuncias').doc(denunciaId).set({
      id: denunciaId,
      gestorId: gestor.gestorId,
      autorId: anonima ? null : colaborador.userId,
      tipo: tiposDenuncia[Math.floor(Math.random() * tiposDenuncia.length)],
      descricao: descricoesDenuncia[Math.floor(Math.random() * descricoesDenuncia.length)],
      anonima,
      status: StatusDenuncia.PENDENTE,
      createdAt,
      updatedAt: createdAt
    });
  }

  console.log('✅ Denúncias de exemplo criadas');

  console.log('\n🏆 Atribuindo badges...');

  for (const gestor of gestoresCreated) {
    const gestorSnap = await firestore.collection('gestores').doc(gestor.gestorId).get();
    const g: any = gestorSnap.data();
    if (!g) continue;

    if (Number(g.mediaAvaliacao || 0) >= 8.5) {
      const badgeId = uuidv4();
      await firestore.collection('badges').doc(badgeId).set({
        id: badgeId,
        gestorId: gestor.gestorId,
        tipo: BadgeType.LIDER_INSPIRADOR,
        descricao: 'Reconhecido por excelente liderança',
        dataConquista: new Date()
      });
      console.log(`  🏆 ${gestor.nome}: Badge Líder Inspirador`);
    }

    if (Number(g.totalAvaliacoes || 0) >= 10) {
      const badgeId = uuidv4();
      await firestore.collection('badges').doc(badgeId).set({
        id: badgeId,
        gestorId: gestor.gestorId,
        tipo: BadgeType.COLABORATIVO,
        descricao: 'Muito engajamento da equipe',
        dataConquista: new Date()
      });
      console.log(`  🤝 ${gestor.nome}: Badge Colaborativo`);
    }
  }

  console.log('\n✨ Seed concluído com sucesso!');
  console.log('\n📋 Credenciais de acesso:');
  console.log('   Admin: admin@pulse360.com / 123456');
  console.log('   Gestor: carlos.silva@pulse360.com / 123456');
  console.log('   Colaborador: joao.pereira@pulse360.com / 123456');
}

main().catch((e) => {
  console.error('Erro no seed:', e);
  process.exit(1);
});
