# InfoHub → InovAMF

Sistema de acompanhamento da jornada do empreendedor no laboratório **InfoHub** da Faculdade Antonio Meneghetti, digitalizando o funil de 6 etapas até o encaminhamento ao centro de inovação **InovAMF**.

Este repositório é o projeto prático da disciplina de **Arquitetura de Sistemas**, do curso de graduação em Sistemas de Informação. O sistema é construído de forma incremental ao longo da cadeira:

- **Fase 1** — frontend Next.js completo com **dados mockados** numa camada `app/src/services/*`.
- **Fase 2 (atual)** — backend real: **servidor Node (Express + TypeScript) em `server/`**, PostgreSQL acessado com **`pg` + SQL escrito à mão (sem ORM)** — decisão do professor: "deixamos o ORM Prisma para quando formos reestruturar o projeto". Cada módulo do backend substitui o `service` mockado correspondente por chamadas HTTP reais.
- **Fases futuras** — reestruturação arquitetural (reintroduzir um ORM, extrair os jobs agendados para um worker/fila separado, dividir módulos em serviços). Cada evolução fica registrada em `PLAN.md` e `decisoes.md`.

`app/prisma/schema.prisma` e `db/diagram.dbml` permanecem como artefatos de design para essa fase futura; **`db/schema.sql` é a fonte da verdade viva do schema.**

## O que o sistema faz

O InfoHub substitui o acompanhamento manual (planilhas + WhatsApp) de equipes de alunos empreendedores por um sistema onde cada equipe percorre uma **jornada de 6 etapas** até ser encaminhada ao InovAMF:

1. Envio da ideia · 2. Contato com a equipe · 3. Encontro 1 – Entendendo a ideia · 4. Encontro 2 – Proposta de valor · 5. Encontro 3 – Modelo de negócio · 6. Encontro 4 – Pitch e inscrição

**Três papéis:**

| Papel | O que faz |
|---|---|
| **Aluno** (líder ou integrante) | Envia a ideia (cadastro público, Etapa 1), acompanha as tarefas da(s) sua(s) equipe(s), envia entregas (arquivo ou link), recebe lembretes por e-mail. Um aluno pode estar em mais de uma equipe. |
| **Mentor** | Enxerga só as equipes atribuídas a ele: acompanha o funil, cria/edita tarefas, aprova ou reprova entregas, avança a equipe de etapa, deixa anotações internas. |
| **Administrador** | Tudo que o mentor faz, sem restrição de equipe, mais: dashboard com indicadores, gestão de contas de mentor/admin, trilha de auditoria. |

**Regras de negócio principais:** RN-01 (transição de etapa validada num ponto único), RN-04 (tarefa vencida sem entrega vira `LATE` automaticamente), RNF-02 (consentimento LGPD no cadastro), RNF-03 (escopo de dados por papel), RNF-05 (auditoria de ações relevantes).

## Documentação

- [`docs/Infohub_InovAMF_Requisitos.md`](docs/Infohub_InovAMF_Requisitos.md) — documento de requisitos original (convertido do PDF fornecido pela coordenação).
- [`docs/modelagem-banco.md`](docs/modelagem-banco.md) — modelagem do banco de dados (tabelas, relacionamentos, decisões Q1–Q7 aplicadas).
- [`docs/frontend-plan.md`](docs/frontend-plan.md) — plano do frontend com dados mockados: design system, telas, arquitetura de mocks/services.
- [`PLAN.md`](PLAN.md) — plano de execução: visão geral, arquitetura, definição de pronto e backlog de tickets (Fase 1 `T00x` e Fase 2 `B0–B8`, seção 10).
- [`decisoes.md`](decisoes.md) — decisões de arquitetura registradas pela dupla (banco/ORM, stack de UI, backend sem ORM), conforme solicitado pelo professor.

## Stack

**Frontend (`app/`)**
- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS + shadcn/ui** na camada de interface
- `app/src/lib/api-client.ts` é a única fronteira HTTP; `app/src/services/*` chamam a API real

**Backend (`server/`)**
- **Node + Express 5 + TypeScript** (ESM, `tsx` em dev)
- **PostgreSQL** (externo — a conexão vem de `DATABASE_URL`) via **`pg` (node-postgres) + SQL puro** — **sem ORM, sem query builder** (ver justificativa e trade-offs em [`decisoes.md`](decisoes.md))
- Auth: `bcryptjs` + JWT de acesso curto (stateless) + refresh token opaco rotativo em cookie `httpOnly`
- Upload de entregas: `multer` em disco (`server/uploads/`), servido em `/uploads`
- Jobs agendados (RN-04, lembretes) num `setInterval` no próprio processo — `server/src/jobs/`
- Validação de entrada: `zod`; testes: `vitest` + `supertest`

## Estrutura do repositório

```
app/                # frontend Next.js
  src/
    app/              # App Router — páginas (público, aluno, admin)
    components/       # UI (ui/ = shadcn, <domínio>/ = componentes de negócio)
    services/         # camada de acesso a dados — chamam a API real via lib/api-client
    lib/              # api-client (fronteira HTTP), session, helpers
    types/            # contratos compartilhados com o backend
  prisma/             # schema.prisma — artefato de design (não usado em runtime)
server/               # backend Express + pg (sem ORM)
  src/
    modules/<ctx>/    # auth, users, reference, teams, tasks, notifications, audit, reports
                      #   cada um: routes -> controller (zod) -> service (regra) -> repository (SQL puro)
    middleware/       # auth (JWT), requireRole, errorHandler
    jobs/             # scheduler (RN-04 + lembretes) + rules puras (testadas)
    db/               # pool, migrate.ts, seed.ts, bootstrap.ts (deploy)
    shared/           # errors, sql (query/one/tx)
db/                   # schema.sql (FONTE DA VERDADE), diagram.dbml
docs/                 # requisitos, modelagem de banco, plano de frontend
entrypoint.sh         # deploy: bootstrap do banco + sobe a API
package.json          # raiz — orquestra app + server + scripts de banco
```

## API (`server/`, base `http://localhost:3333`)

Acesso: **JWT** no header `Authorization: Bearer <accessToken>` (obtido no login, guardado só em memória no front); o **refresh token** vai num cookie `httpOnly` e é rotacionado a cada `/auth/refresh`.

| Método & rota | Acesso | Descrição |
|---|---|---|
| `GET /health` | público | healthcheck |
| `POST /auth/login` | público | login por e-mail + senha → `{ accessToken, user }` + cookie |
| `POST /auth/refresh` | cookie | rotaciona a sessão |
| `POST /auth/logout` | cookie | revoga o refresh token |
| `POST /auth/password-reset` / `.../confirm` | público | link de definição de senha — primeiro acesso e "esqueci minha senha" (request sempre 204) |
| `GET /users/me` | autenticado | usuário da sessão (+ perfil de aluno) |
| `GET /users/mentors` | staff | mentores (para o filtro do funil) |
| `GET/POST /users/staff`, `PATCH /users/staff/:id`, `PATCH /users/staff/:id/active` | admin | gestão de contas de mentor/admin (RF-03) |
| `GET /journey-stages`, `GET /idea-areas`, `GET /cohorts` | público | dados de referência |
| `POST /teams` | público | cadastro da equipe — Etapa 1 (RF-02); autentica o líder |
| `GET /teams` | staff | funil/board com filtros (`?search=&course=&areaId=&cohort=&mentorId=&taskStatus=`) |
| `GET /teams/mine` | aluno | equipes do usuário |
| `GET /teams/:id` | staff **ou** membro/mentor da equipe | detalhe (RF-08/10) |
| `POST /teams/:id/stage` | staff (mentor: só suas equipes) | avança/retrocede etapa (RF-09, RN-01) |
| `POST /teams/:id/notes` | staff | anotação interna (RF-10) |
| `GET /task-templates?stageId=` | staff | modelos de tarefa por etapa (RF-11) |
| `POST /tasks`, `PATCH /tasks/:id` | staff | cria/edita tarefa (RF-11/12) |
| `GET /teams/:teamId/tasks`, `GET /tasks/mine` | conforme escopo da equipe | tarefas com entregas e lembretes |
| `POST /tasks/:id/submissions` | aluno da equipe | entrega: `multipart/form-data` (campo `file`) **ou** `{ externalLink }` (RF-14/16) |
| `POST /submissions/:id/review` | staff | aprova/reprova (RF-15) |
| `POST /tasks/:id/reminders` | staff | agenda `{ remindAt }` (RF-17) ou `{ manual: true }` dispara já (RF-20) |
| `GET /audit-logs?limit=` | staff | trilha de auditoria (RNF-05) |
| `GET /notifications/mine?limit=` | autenticado | histórico de e-mails do usuário |
| `GET /reports/dashboard?cohort=` | staff | indicadores agregados (RF-22/24) |

Erros seguem o formato `{ "error": { "code", "message", "fields"? } }` (400 validação/zod, 401 sem sessão, 403 papel/escopo, 404, 409 conflito).

## Como rodar (setup local)

Pré-requisitos: **Node 20+** e **um PostgreSQL acessível** — instalação local, um
container que você suba por conta própria, ou um serviço gerenciado (Neon,
Supabase, RDS…). A conexão vem de `DATABASE_URL` no `server/.env`; o repositório
não sobe mais um banco pra você.

```bash
npm install                  # instala a raiz + app/ + server/ (via postinstall)
cp .env.example .env         # um ÚNICO .env na raiz — ajuste DATABASE_URL

npm run db:reset             # recria SEU schema (DB_SCHEMA) e aplica db/schema.sql — recusa `public`
npm run db:seed              # popula dados de demo (todas as contas: senha "senha123")
#   atalho: npm run db:setup  = db:reset + db:seed

npm run dev                  # sobe front (:3000) e API (:3333) juntos (concurrently)
```

Tudo lê o **`.env` da raiz** (server via `server/src/config/env.ts`, Next via
`app/next.config.ts`). O front chama a API por `/api/*` e o Next reescreve para a
API local — vale em dev e no deploy, sem CORS. Não precisa de
`NEXT_PUBLIC_API_URL` a menos que queira bater direto na API.

<details><summary>Subir um Postgres rápido com Docker (opcional)</summary>

```bash
docker run -d --name infohub-db -e POSTGRES_USER=infohub -e POSTGRES_PASSWORD=infohub \
  -e POSTGRES_DB=infohub -p 5432:5432 postgres:16-alpine
```
Isso bate com o `DATABASE_URL` de exemplo. Pare com `docker rm -f infohub-db`.
</details>

Contas do seed: `ana.souza@infohub.amf.br` (admin), `fernanda.ribeiro@infohub.amf.br` (mentor), `joao.alves@acad.amf.br` (aluno). O seed monta um cenário completo: 7 equipes espalhadas pelas 6 etapas, 15 tarefas em todos os status, entregas com histórico de versão, lembretes, e-mails e auditoria.

Outros scripts da raiz: `npm run build`, `npm run start`, `npm run lint` (app), `npm run typecheck` / `npm test` (server), `npm run db:migrate` (aplica o schema sem dropar).

### Variáveis de ambiente (`.env` na raiz — ver `.env.example`)

| Variável | Padrão | Para quê |
|---|---|---|
| `PORT` | `3000` | porta do front (Next); no deploy a plataforma injeta |
| `API_PORT` | `3333` | porta **interna** da API (o Next reescreve `/api/*` pra ela) |
| `APP_URL` | `http://localhost:3000` | URL pública do app — base dos links de e-mail |
| `CORS_ORIGIN` | `http://localhost:3000` | só usada em acesso cross-origin à API (dev sem o proxy) |
| `REFRESH_COOKIE_PATH` | `/` | path do cookie de refresh (cobre acesso direto e via `/api`) |
| `DATABASE_URL` | `postgresql://infohub:infohub@localhost:5432/infohub` | conexão com o seu Postgres (local, container próprio ou gerenciado; `?sslmode=require` quando o provedor exigir) |
| `DB_SCHEMA` | `infohub` | schema do Postgres onde ficam as tabelas (o pool fixa o `search_path`); num banco compartilhado, o seu |
| `JWT_ACCESS_SECRET` | — (obrigatória) | assina o access token |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | vazio | 1º admin criado no bootstrap se não existir nenhum |
| `COOKIE_SECURE` | `true` em produção | flag Secure do cookie de refresh; `false` só p/ HTTP puro |
| `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL_DAYS` | `15m` / `30` | validade dos tokens |
| `BCRYPT_ROUNDS` | `10` | custo do hash de senha |
| `MAIL_API_URL` / `MAIL_API_KEY` | mail-service / vazio | envio real de e-mail pelo mail-service (`POST /emails`, `x-api-key`). Sem a chave, só loga no console |
| `MAIL_SKIP_DOMAINS` | `acad.amf.br,infohub.amf.br` | contas de demonstração (seed) **não** recebem e-mail real — só log |
| `UPLOAD_DIR` / `MAX_UPLOAD_MB` | `uploads` / `50` | entregas de arquivo (RNF-04) |

`INTERNAL_API_URL` (ou `API_PORT`) muda o alvo do proxy `/api/*` se a API não
estiver em `127.0.0.1:3333`. `NEXT_PUBLIC_API_URL` só para o front bater direto
na API, sem o proxy.

### Problemas comuns

| Sintoma | Causa / solução |
|---|---|
| API não sobe: "Não consegui conectar ao Postgres" | `DATABASE_URL` errada ou o banco não está no ar. Teste com `psql "$DATABASE_URL" -c 'select 1'`. |
| `db:reset` falha com erro de permissão de schema | o usuário do `DATABASE_URL` precisa poder `DROP SCHEMA public` / `CREATE SCHEMA` (use `db:migrate` se só quiser aplicar o schema num banco vazio). |
| Provedor gerenciado recusa a conexão | falta `?sslmode=require` no fim da `DATABASE_URL`. |
| Login sempre 401 depois de mexer no banco | rode `npm run db:seed` de novo (os testes de integração revogam tokens; o seed limpa tudo). |
| `npm test` (server) falha em massa | o teste de auth é de integração — precisa do banco populado (`npm run db:setup`). |
| Front carrega mas as chamadas `/api/*` dão 404 | a API não subiu (veja o log do `api` no `concurrently`), ou `INTERNAL_API_URL` aponta pro lugar errado. |
| Chamadas cross-origin diretas à API dão erro de CORS | você definiu `NEXT_PUBLIC_API_URL` apontando pra outra origem — ajuste `CORS_ORIGIN` no `server/.env` ou remova a var e use o proxy. |

### Testes

```bash
cd server && npm test        # vitest: regras do funil (RN-01), jobs (RN-04/RF-17), fluxo de auth
```

O teste de auth é de integração e usa o banco populado — rode `npm run db:setup` antes.

### Jobs agendados

`server/src/jobs/scheduler.ts` roda dentro do processo da API (`setInterval`, 5 min): marca tarefas vencidas como `LATE` (RN-04) e dispara lembretes cuja data chegou (RF-17). É um módulo isolado de propósito — candidato natural a virar um worker separado na fase de reestruturação.

## Deploy (Coolify / container — recurso único)

Os dois processos (front na `PORT`, API interna na `API_PORT`) rodam no **mesmo
recurso**. Só a porta do front fica exposta; o browser fala com a API por
`/api/*`, que o Next reescreve para `http://127.0.0.1:${API_PORT}` — same-origin,
sem CORS, cookie de sessão simples (`app/next.config.ts`).

| Campo (Coolify) | Valor |
|---|---|
| Base directory | `/` |
| Install command | `npm install` &nbsp;(o `postinstall` instala `app/` e `server/`) |
| Build command | `npm run build` |
| Start command | `./entrypoint.sh` |
| Porta exposta | `3000` (ou `$PORT`) |

`entrypoint.sh`:
1. `server/dist/db/bootstrap.js` — espera o Postgres, aplica `db/schema.sql`
   **só se o banco estiver vazio** (idempotente, seguro a cada deploy — não há
   migrations incrementais ainda);
2. `concurrently -k` sobe **front + API juntos** (se um cair, o container
   reinicia).

**Env de runtime** (Coolify → *Environment Variables*):

| Var | Para quê |
|---|---|
| `DATABASE_URL` | string de conexão do Postgres |
| `DB_SCHEMA` | **seu schema** no banco (ex.: `infohub_yuri`). Criado sozinho no 1º boot se faltar. Num banco compartilhado é o que isola você dos outros — nunca use `public` |
| `NODE_ENV` | `production` |
| `JWT_ACCESS_SECRET` | segredo longo e aleatório: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | 1º administrador (criado no boot se ainda não houver nenhum ADMIN; senha ≥ 8). Sem isso ninguém consegue entrar — a menos que use `SEED_ON_INIT` |
| `APP_URL` | URL pública do app (a do Coolify, com `https://`) — base dos links de e-mail (`/definir-senha?token=…`) |
| `PORT` | porta do front (a plataforma injeta) |
| `API_PORT` | porta **interna** da API (opcional, default `3333`) |
| `COOKIE_SECURE` | `false` **somente** se o app for servido em `http://` puro (sem TLS); com HTTPS deixe em branco |
| `MAIL_API_KEY` | chave do mail-service — habilita o envio real de e-mail (sem ela só loga). **Segredo: só nas envs do Coolify, nunca no git** |
| `SEED_ON_INIT=true` | opcional — se o banco ainda não tem usuários, popula o dataset de demo (contas `senha123`; não use num ambiente real) |
| `NEXT_PUBLIC_API_URL` | **não definir** neste modo — o default `/api` (proxy) é o certo |

**Banco compartilhado.** O bootstrap só mexe no `DB_SCHEMA`: cria o schema, aplica as
tabelas se faltarem e garante áreas de ideia, modelos de tarefa e o 1º admin. `db:reset`
e `db:seed` **recusam** o `public` e qualquer schema que não seja deste app.

## Status

- **Fase 1 (frontend)** — completo: ~34 tickets `T-FE-xx`, todas as telas do funil.
- **Fase 2 (backend)** — completo: tickets `B0–B8` (auth, equipes/funil, tarefas/entregas, notificações, auditoria, dashboard, jobs agendados), cada módulo já ligado ao front real. Ver [`PLAN.md`](PLAN.md), seção 10.
- Testes: `cd server && npm test` (21 — regras do funil, jobs, fluxo de auth). Validação ponta a ponta em navegador (Playwright) cobrindo login, dashboard, funil, detalhe de equipe, auditoria e área do aluno.
- **Pendente:** deploy hospedado (`T024`) e troca do `ConsoleEmailSender` pelo Resend quando houver domínio verificado.
