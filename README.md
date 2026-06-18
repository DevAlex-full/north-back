# 🧭 North — Backend API

Sistema pessoal de organização de rotina, finanças e produtividade.

## 🚀 Stack

- **Runtime:** Node.js + TypeScript Strict
- **Framework:** Fastify
- **ORM:** Prisma
- **Banco:** PostgreSQL (Supabase)
- **Auth:** JWT + Refresh Token
- **Validação:** Zod
- **Deploy:** Render

---

## 🔐 Segurança (v2)

- **Access Token** assinado via `@fastify/jwt` usando `JWT_SECRET`.
- **Refresh Token** assinado separadamente via `jsonwebtoken` usando `JWT_REFRESH_SECRET` — secret diferente do access token, com rotação a cada uso (o token antigo é revogado ao gerar um novo).
- **Validação Zod** em `request.body`, `request.params` e `request.query` de todos os endpoints (`src/validators/*.validator.ts`).
- **Geração automática de tarefas diárias**: `TaskService.ensureTasksForDate()` cria as tarefas do dia a partir dos `ScheduleBlock` ativos para o dia da semana, sem duplicar, sempre que o dashboard ou a agenda são consultados.

---

## 📦 Changelog v2

- ✅ Corrigido: refresh token usava o mesmo secret do access token.
- ✅ Adicionado: validação Zod em 10 controllers que recebiam `request.body as any`.
- ✅ Corrigido: dashboard ficava vazio no dia seguinte ao seed (tarefas agora são geradas automaticamente a partir da rotina semanal).
- ✅ Adicionada dependência `jsonwebtoken` + `@types/jsonwebtoken`.
- ✅ `pino-pretty` e `dotenv` movidos para `devDependencies`.

---

## ⚙️ Pré-requisitos

- Node.js 18+
- npm ou yarn
- PostgreSQL (local ou Supabase)

---

## 🛠️ Instalação

```bash
# 1. Clone o repositório
git clone <repo-url>
cd north-backend

# 2. Instale as dependências
npm install

# 3. Configure o ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# 4. Gere o Prisma Client
npm run db:generate

# 5. Execute as migrations
npm run db:migrate

# 6. Rode o seed inicial
npm run db:seed

# 7. Inicie o servidor
npm run dev
```

---

## 🌍 Variáveis de Ambiente

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
JWT_SECRET="sua-chave-secreta-jwt"
JWT_REFRESH_SECRET="sua-chave-secreta-refresh"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
NODE_ENV="development"
CORS_ORIGIN="*"
```

---

## 🗄️ Banco de Dados (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **Settings → Database**
3. Copie a **Connection String** (modo `URI`)
4. Cole no `.env` como `DATABASE_URL`

---

## ☁️ Deploy no Render

1. Crie conta em [render.com](https://render.com)
2. Novo serviço → **Web Service**
3. Conecte o repositório GitHub
4. Configure:
   - **Build Command:** `npm install && npm run db:generate && npm run build`
   - **Start Command:** `npm run db:migrate:prod && node dist/server.js`
5. Adicione as variáveis de ambiente
6. Deploy!

---

## 📡 Endpoints da API

### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/v1/auth/register` | Cadastro |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Renovar token |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/auth/me` | Perfil |
| PUT | `/api/v1/auth/profile` | Atualizar perfil |
| PUT | `/api/v1/auth/settings` | Configurações |
| PUT | `/api/v1/auth/notifications` | Notificações |

### Dashboard
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/dashboard` | Dados do dashboard |

### Tarefas
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/tasks` | Listar tarefas |
| GET | `/api/v1/tasks/progress` | Progresso do dia |
| POST | `/api/v1/tasks` | Criar tarefa |
| PUT | `/api/v1/tasks/:id` | Atualizar tarefa |
| DELETE | `/api/v1/tasks/:id` | Deletar tarefa |

### Financeiro
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/financial/categories` | Categorias |
| POST | `/api/v1/financial/categories` | Criar categoria |
| GET | `/api/v1/financial/transactions` | Transações |
| POST | `/api/v1/financial/transactions` | Registrar transação |
| GET | `/api/v1/financial/summary?period=day\|week\|month` | Resumo |
| GET | `/api/v1/financial/daily-goal` | Meta Indrive do dia |
| PUT | `/api/v1/financial/daily-goal` | Atualizar meta |
| GET | `/api/v1/financial/suggestion?amount=200` | Sugestão divisão |

### Leads / CRM
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/leads` | Listar leads |
| POST | `/api/v1/leads` | Criar lead |
| PUT | `/api/v1/leads/:id` | Atualizar lead |
| DELETE | `/api/v1/leads/:id` | Deletar lead |

### Workana
| GET | `/api/v1/workana` | Listar propostas |
| GET | `/api/v1/workana/week-count` | Propostas da semana |
| POST | `/api/v1/workana` | Criar proposta |

### Projetos
| GET | `/api/v1/projects` | Listar projetos |
| POST | `/api/v1/projects` | Criar projeto |
| POST | `/api/v1/projects/:id/tasks` | Criar tarefa do projeto |

### Metas
| GET | `/api/v1/goals` | Listar metas |
| PUT | `/api/v1/goals/:id` | Atualizar progresso |

### Agenda
| GET | `/api/v1/schedule?dayOfWeek=1` | Blocos da semana |

### Conteúdo
| GET | `/api/v1/content?platform=instagram` | Conteúdos |

### Empregos
| GET | `/api/v1/jobs` | Vagas |

---

## 🏥 Health Check

```
GET /health
```

---

## 🔐 Credenciais do Seed

```
Email: alex@north.app
Senha: north2024
```

---

## 📁 Estrutura

```
src/
├── app/           # Configuração do Fastify
├── config/        # Variáveis de ambiente
├── controllers/   # Handlers das rotas
├── routes/        # Definição das rotas
├── services/      # Regras de negócio
├── repositories/  # Acesso ao banco
├── middlewares/   # Auth, erros
├── lib/           # Prisma client
├── types/         # Tipagens
└── server.ts      # Entry point

prisma/
├── schema.prisma  # Schema do banco
└── seed.ts        # Dados iniciais
```
