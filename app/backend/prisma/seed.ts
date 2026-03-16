import { PrismaClient, Role, TipoDenuncia, BadgeType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpar dados existentes
  await prisma.badge.deleteMany();
  await prisma.avaliacaoLog.deleteMany();
  await prisma.avaliacao.deleteMany();
  await prisma.denuncia.deleteMany();
  await prisma.gestor.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('123456', 10);

  // Criar usuário Admin/RH
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@pulse360.com',
      password: hashedPassword,
      nome: 'Administrador RH',
      role: Role.RH_ADMIN
    }
  });

  console.log('✅ Usuário Admin criado:', adminUser.email);

  // Criar Gestores
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

  const gestoresCreated = [];

  for (const gestor of gestores) {
    const user = await prisma.user.create({
      data: {
        email: gestor.email,
        password: hashedPassword,
        nome: gestor.nome,
        role: Role.GESTOR
      }
    });

    const gestorProfile = await prisma.gestor.create({
      data: {
        userId: user.id,
        cargo: gestor.cargo,
        departamento: gestor.departamento,
        bio: gestor.bio
      }
    });

    gestoresCreated.push({ user, gestor: gestorProfile });
    console.log('✅ Gestor criado:', gestor.nome);
  }

  // Criar Colaboradores
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

  const colaboradoresCreated = [];

  for (const colab of colaboradores) {
    const user = await prisma.user.create({
      data: {
        email: colab.email,
        password: hashedPassword,
        nome: colab.nome,
        role: Role.COLABORADOR
      }
    });

    colaboradoresCreated.push(user);
    console.log('✅ Colaborador criado:', colab.nome);
  }

  // Criar Avaliações
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

  for (const gestorData of gestoresCreated) {
    // Cada gestor recebe avaliações de vários colaboradores
    const numAvaliacoes = Math.floor(Math.random() * 8) + 5; // 5-12 avaliações

    for (let i = 0; i < numAvaliacoes; i++) {
      const colaborador = colaboradoresCreated[Math.floor(Math.random() * colaboradoresCreated.length)];
      const nota = Math.floor(Math.random() * 4) + 7; // Notas entre 7-10

      const hasElogio = Math.random() > 0.3;
      const hasSugestao = Math.random() > 0.6;
      const hasCritica = Math.random() > 0.8;

      await prisma.avaliacao.create({
        data: {
          gestorId: gestorData.gestor.id,
          autorId: colaborador.id,
          nota,
          elogio: hasElogio ? elogios[Math.floor(Math.random() * elogios.length)] : null,
          sugestao: hasSugestao ? sugestoes[Math.floor(Math.random() * sugestoes.length)] : null,
          critica: hasCritica ? criticas[Math.floor(Math.random() * criticas.length)] : null,
          createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) // últimos 90 dias
        }
      });

      await prisma.avaliacaoLog.create({
        data: {
          autorId: colaborador.id,
          gestorId: gestorData.gestor.id
        }
      });
    }

    // Atualizar média do gestor
    const avaliacoes = await prisma.avaliacao.findMany({
      where: { gestorId: gestorData.gestor.id },
      select: { nota: true }
    });

    const media = avaliacoes.reduce((acc, a) => acc + a.nota, 0) / avaliacoes.length;

    await prisma.gestor.update({
      where: { id: gestorData.gestor.id },
      data: {
        mediaAvaliacao: Number(media.toFixed(1)),
        totalAvaliacoes: avaliacoes.length
      }
    });

    console.log(`  ✅ ${gestorData.user.nome}: ${avaliacoes.length} avaliações, média ${media.toFixed(1)}`);
  }

  // Criar algumas denúncias de exemplo
  console.log('\n🚨 Criando denúncias de exemplo...');

  const tiposDenuncia = [
    TipoDenuncia.COMPORTAMENTO_INADEQUADO,
    TipoDenuncia.ASSEDIO_MORAL,
    TipoDenuncia.ABUSO_AUTORIDADE
  ];

  const descricoesDenuncia = [
    'Comportamento agressivo em reunião de equipe.',
    'Comentários inapropriados sobre aparência de colaboradores.',
    'Pressão excessiva para cumprimento de metas irrealistas.',
    'Favoritismo na distribuição de tarefas e promoções.'
  ];

  for (let i = 0; i < 3; i++) {
    const gestor = gestoresCreated[Math.floor(Math.random() * gestoresCreated.length)];
    const colaborador = colaboradoresCreated[Math.floor(Math.random() * colaboradoresCreated.length)];

    await prisma.denuncia.create({
      data: {
        gestorId: gestor.gestor.id,
        autorId: Math.random() > 0.5 ? colaborador.id : null, // 50% anônimas
        tipo: tiposDenuncia[Math.floor(Math.random() * tiposDenuncia.length)],
        descricao: descricoesDenuncia[Math.floor(Math.random() * descricoesDenuncia.length)],
        anonima: Math.random() > 0.5,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      }
    });
  }

  console.log('✅ Denúncias de exemplo criadas');

  // Criar badges para gestores com boas avaliações
  console.log('\n🏆 Atribuindo badges...');

  for (const gestorData of gestoresCreated) {
    const gestor = await prisma.gestor.findUnique({
      where: { id: gestorData.gestor.id }
    });

    if (gestor && gestor.mediaAvaliacao >= 8.5) {
      await prisma.badge.create({
        data: {
          gestorId: gestor.id,
          tipo: BadgeType.LIDER_INSPIRADOR,
          descricao: 'Reconhecido por excelente liderança'
        }
      });
      console.log(`  🏆 ${gestorData.user.nome}: Badge Líder Inspirador`);
    }

    if (gestor && gestor.totalAvaliacoes >= 10) {
      await prisma.badge.create({
        data: {
          gestorId: gestor.id,
          tipo: BadgeType.COLABORATIVO,
          descricao: 'Muito engajamento da equipe'
        }
      });
      console.log(`  🤝 ${gestorData.user.nome}: Badge Colaborativo`);
    }
  }

  console.log('\n✨ Seed concluído com sucesso!');
  console.log('\n📋 Credenciais de acesso:');
  console.log('   Admin: admin@pulse360.com / 123456');
  console.log('   Gestor: carlos.silva@pulse360.com / 123456');
  console.log('   Colaborador: joao.pereira@pulse360.com / 123456');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
