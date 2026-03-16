# Pulse360

![Pulse360](https://img.shields.io/badge/Pulse360-Feedback%20Platform-98d4a0?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![Node.js](https://img.shields.io/badge/Node.js-20-green?style=flat-square&logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=flat-square&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)

**Pulse360** é uma plataforma interna para colaboradores avaliarem gestores, dando feedbacks, notas e realizando denúncias confidenciais através de uma ouvidoria integrada.

## Funcionalidades

### Para Colaboradores
- Avaliar gestores com notas de 1 a 10
- Escrever elogios, sugestões e críticas construtivas
- Registrar denúncias confidenciais na ouvidoria
- Visualizar perfis públicos dos gestores
- Ver ranking dos melhores gestores

### Para Gestores
- Criar e editar perfil público
- Acompanhar média de avaliações
- Visualizar gráficos de evolução
- Receber notificações via Slack
- Ver histórico de feedbacks

### Para RH/Admin
- Dashboard completo com métricas
- Gerenciar todas as denúncias
- Exportar dados em CSV
- Visualizar gestores com mais denúncias
- Filtrar por período e categoria

## Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 14, React 18, TypeScript |
| Backend | Node.js, Express, TypeScript |
| Banco de Dados | PostgreSQL 15 |
| ORM | Prisma |
| Autenticação | JWT |
| UI | TailwindCSS (Neobrutalismo) |
| Integração | Slack Bot API |
| Deploy | Docker, Docker Compose |

## Estrutura do Projeto

```
pulse360/
├── app/
│   ├── frontend/          # Aplicação Next.js
│   ├── backend/           # API REST Express
│   ├── slack-bot/         # Bot do Slack
│   └── database/          # Scripts de banco
├── docker-compose.yml     # Orquestração Docker
├── .env.example           # Variáveis de ambiente
└── README.md
```

## Instalação

### Pré-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com) (gratuito)
- npm ou yarn

### Configuração do Supabase

1. **Crie um projeto no Supabase**
   - Acesse [supabase.com](https://supabase.com) e crie uma conta
   - Clique em "New Project"
   - Escolha um nome e senha para o banco

2. **Obtenha as URLs de conexão**
   - Vá em **Settings** > **Database**
   - Em **Connection string**, copie a **URI**
   - Você precisará de duas URLs:
     - **Transaction (porta 6543)**: Para a aplicação
     - **Session (porta 5432)**: Para migrations

3. **Configure as variáveis**
   ```env
   # URL com pooler (aplicação)
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

   # URL direta (migrations)
   DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
   ```

### Desenvolvimento Local

1. **Clone o repositório**
```bash
git clone https://github.com/alcinadadosti-worspace/FeedBackslim.git
cd FeedBackslim
```

2. **Configure as variáveis de ambiente**
```bash
# Na raiz do projeto
cp .env.example .env

# No backend
cp app/backend/.env.example app/backend/.env

# No frontend
cp app/frontend/.env.example app/frontend/.env
```

Edite os arquivos `.env` com suas credenciais do Supabase.

3. **Instale as dependências do Backend**
```bash
cd app/backend
npm install
```

4. **Configure o banco de dados**
```bash
# Gerar o cliente Prisma
npm run db:generate

# Executar as migrations (push para Supabase)
npm run db:push

# Popular com dados de exemplo
npm run db:seed
```

5. **Inicie o Backend**
```bash
npm run dev
```

6. **Em outro terminal, instale e inicie o Frontend**
```bash
cd app/frontend
npm install
npm run dev
```

7. **Acesse a aplicação**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Deploy com Docker

1. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env
```

2. **Build e execute os containers**
```bash
# Apenas frontend e backend
docker-compose up -d

# Com Slack Bot
docker-compose --profile slack up -d
```

3. **Execute o seed (opcional)**
```bash
docker-compose exec backend npx tsx prisma/seed.ts
```

## Configuração do Slack Bot

### 1. Criar App no Slack

1. Acesse [api.slack.com/apps](https://api.slack.com/apps)
2. Clique em "Create New App"
3. Escolha "From scratch"
4. Nome: `Pulse360` | Workspace: Seu workspace

### 2. Configurar Permissões

Em **OAuth & Permissions**, adicione os scopes:

**Bot Token Scopes:**
- `chat:write`
- `im:write`
- `users:read`
- `commands`
- `app_mentions:read`

### 3. Configurar Socket Mode

1. Vá em **Socket Mode**
2. Ative o Socket Mode
3. Crie um App-Level Token com scope `connections:write`
4. Copie o token (começa com `xapp-`)

### 4. Instalar no Workspace

1. Vá em **Install App**
2. Clique em "Install to Workspace"
3. Copie o **Bot User OAuth Token** (começa com `xoxb-`)

### 5. Configurar Variáveis

```env
SLACK_BOT_TOKEN=xoxb-seu-token
SLACK_SIGNING_SECRET=seu-signing-secret
SLACK_APP_TOKEN=xapp-seu-app-token
SLACK_RH_CHANNEL=id-do-canal-rh
```

## Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `DATABASE_URL` | URL Supabase com pooler (porta 6543) | Sim |
| `DIRECT_URL` | URL Supabase direta (porta 5432) | Sim |
| `JWT_SECRET` | Chave secreta para JWT | Sim |
| `FRONTEND_URL` | URL do frontend | Sim |
| `BACKEND_URL` | URL do backend | Sim |
| `NEXT_PUBLIC_API_URL` | URL da API para o frontend | Sim |
| `SLACK_BOT_TOKEN` | Token do Bot Slack | Não |
| `SLACK_SIGNING_SECRET` | Signing Secret do Slack | Não |
| `SLACK_APP_TOKEN` | App Token do Slack | Não |
| `SLACK_RH_CHANNEL` | ID do canal do RH | Não |

## Credenciais de Demo

Após executar o seed, você pode acessar com:

| Tipo | Email | Senha |
|------|-------|-------|
| Admin/RH | admin@pulse360.com | 123456 |
| Gestor | carlos.silva@pulse360.com | 123456 |
| Colaborador | joao.pereira@pulse360.com | 123456 |

## Deploy no Render (com Supabase)

### Backend

1. Crie um novo **Web Service**
2. Conecte ao repositório
3. **Root Directory:** `app/backend`
4. **Build Command:** `npm install && npx prisma generate && npm run build`
5. **Start Command:** `npx prisma db push && npm start`
6. Configure as variáveis de ambiente:
   - `DATABASE_URL` - URL do Supabase (porta 6543)
   - `DIRECT_URL` - URL do Supabase (porta 5432)
   - `JWT_SECRET` - Chave secreta forte
   - `FRONTEND_URL` - URL do frontend no Render
   - `BACKEND_URL` - URL deste serviço

### Frontend

1. Crie um novo **Web Service**
2. Conecte ao repositório
3. **Root Directory:** `app/frontend`
4. **Build Command:** `npm install && npm run build`
5. **Start Command:** `npm start`
6. Configure as variáveis:
   - `NEXT_PUBLIC_API_URL` - URL do backend + `/api`

### Banco de Dados (Supabase)

1. Use o projeto Supabase já criado
2. As tabelas serão criadas automaticamente no primeiro deploy
3. Para popular dados iniciais, execute localmente:
   ```bash
   cd app/backend
   npm run db:seed
   ```

## API Endpoints

### Autenticação
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuário atual

### Gestores
- `GET /api/gestores` - Listar gestores
- `GET /api/gestores/:id` - Detalhes do gestor
- `GET /api/gestores/ranking` - Ranking
- `PUT /api/gestores/:id` - Atualizar perfil

### Avaliações
- `GET /api/avaliacoes` - Listar avaliações
- `POST /api/avaliacoes` - Criar avaliação
- `GET /api/avaliacoes/:id` - Detalhes

### Denúncias
- `GET /api/denuncias` - Listar (Admin)
- `POST /api/denuncias` - Criar denúncia
- `PATCH /api/denuncias/:id/status` - Atualizar status

### Dashboard
- `GET /api/dashboard/colaborador` - Dashboard do colaborador
- `GET /api/dashboard/gestor` - Dashboard do gestor
- `GET /api/dashboard/admin` - Dashboard administrativo
- `GET /api/dashboard/export` - Exportar dados

## Design System

O design segue o estilo **Neobrutalismo elegante** com:

- **Cores principais:** Verde pastel (#98d4a0), Ouro pastel (#d4b896)
- **Bordas:** 3px sólidas em preto
- **Sombras:** Estilo brutal (offset sólido)
- **Tipografia:** Inter (texto) e Space Grotesk (títulos)
- **Layout:** Cards grandes, minimalista e profissional

## Contribuindo

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Licença

Este projeto é privado e de uso interno.

---

Desenvolvido com por **Pulse360 Team**
