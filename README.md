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
- **PostgreSQL** via **`pg` (node-postgres) + SQL puro** — **sem ORM, sem query builder** (ver justificativa e trade-offs em [`decisoes.md`](decisoes.md))
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
    db/               # pool, migrate.ts (aplica db/schema.sql), seed.ts
    shared/           # errors, sql (query/one/tx)
db/                   # schema.sql (FONTE DA VERDADE), diagram.dbml
docker-compose.yml    # Postgres 16 local
docs/                 # requisitos, modelagem de banco, plano de frontend
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

Pré-requisitos: **Node 20+** e **Docker** (Docker Desktop precisa estar rodando para o Postgres).

```bash
npm install                  # deps da raiz (concurrently)
npm run install:all          # deps de app/ e de server/
cp server/.env.example server/.env
cp app/.env.local.example app/.env.local

npm run db:up                # sobe o Postgres no Docker (porta 5432)
npm run db:reset             # aplica db/schema.sql num banco limpo
npm run db:seed              # popula dados de demo (todas as contas: senha "senha123")
#   atalho: npm run db:setup  = db:up + db:reset + db:seed

npm run dev                  # sobe front (:3000) e API (:3333) juntos (concurrently)
```

Contas do seed: `ana.souza@infohub.amf.br` (admin), `fernanda.ribeiro@infohub.amf.br` (mentor), `joao.alves@acad.amf.br` (aluno). O seed monta um cenário completo: 7 equipes espalhadas pelas 6 etapas, 15 tarefas em todos os status, entregas com histórico de versão, lembretes, e-mails e auditoria.

Outros scripts da raiz: `npm run build`, `npm run start`, `npm run lint` (app), `npm run typecheck` / `npm test` (server), `npm run db:down`.

### Variáveis de ambiente (`server/.env`)

| Variável | Padrão | Para quê |
|---|---|---|
| `PORT` | `3333` | porta da API |
| `CORS_ORIGIN` | `http://localhost:3000` | origem do front liberada (cookies) |
| `DATABASE_URL` | `postgresql://infohub:infohub@localhost:5432/infohub` | conexão Postgres (bate com o `docker-compose.yml`) |
| `JWT_ACCESS_SECRET` | — (obrigatória) | assina o access token |
| `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL_DAYS` | `15m` / `30` | validade dos tokens |
| `BCRYPT_ROUNDS` | `10` | custo do hash de senha |
| `RESEND_API_KEY` | vazio | vazio = usa o `ConsoleEmailSender` (loga + grava `email_notifications`) |
| `UPLOAD_DIR` / `MAX_UPLOAD_MB` | `uploads` / `50` | entregas de arquivo (RNF-04) |

No front, `app/.env.local` só precisa de `NEXT_PUBLIC_API_URL=http://localhost:3333`.

### Problemas comuns

| Sintoma | Causa / solução |
|---|---|
| `db:up` falha ou trava | Docker Desktop não está rodando. |
| API não sobe: "Não consegui conectar ao Postgres" | rode `npm run db:up` antes; confira se a porta 5432 já não está em uso por outro Postgres local. |
| Porta 5432 ocupada | pare o Postgres local, ou mude a porta no `docker-compose.yml` **e** no `DATABASE_URL`. |
| Login sempre 401 depois de mexer no banco | rode `npm run db:seed` de novo (os testes de integração revogam tokens; o seed limpa tudo). |
| `npm test` (server) falha em massa | o teste de auth é de integração — precisa do banco populado (`npm run db:setup`). |
| Front carrega mas nada aparece / 401 no console | `app/.env.local` sem `NEXT_PUBLIC_API_URL`, ou a API não está no ar. |

### Testes

```bash
cd server && npm test        # vitest: regras do funil (RN-01), jobs (RN-04/RF-17), fluxo de auth
```

O teste de auth é de integração e usa o banco populado — rode `npm run db:setup` antes.

### Jobs agendados

`server/src/jobs/scheduler.ts` roda dentro do processo da API (`setInterval`, 5 min): marca tarefas vencidas como `LATE` (RN-04) e dispara lembretes cuja data chegou (RF-17). É um módulo isolado de propósito — candidato natural a virar um worker separado na fase de reestruturação.

## Status

- **Fase 1 (frontend)** — completo: ~34 tickets `T-FE-xx`, todas as telas do funil.
- **Fase 2 (backend)** — completo: tickets `B0–B8` (auth, equipes/funil, tarefas/entregas, notificações, auditoria, dashboard, jobs agendados), cada módulo já ligado ao front real. Ver [`PLAN.md`](PLAN.md), seção 10.
- Testes: `cd server && npm test` (21 — regras do funil, jobs, fluxo de auth). Validação ponta a ponta em navegador (Playwright) cobrindo login, dashboard, funil, detalhe de equipe, auditoria e área do aluno.
- **Pendente:** deploy hospedado (`T024`) e troca do `ConsoleEmailSender` pelo Resend quando houver domínio verificado.
