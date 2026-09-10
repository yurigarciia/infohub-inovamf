# InfoHub → InovAMF

Sistema de acompanhamento da jornada do empreendedor no laboratório **InfoHub** da Faculdade Antonio Meneghetti, digitalizando o funil de 6 etapas até o encaminhamento ao centro de inovação **InovAMF**.

Este repositório é o projeto prático da disciplina de **Arquitetura de Sistemas**, do curso de graduação em Sistemas de Informação. O sistema é construído de forma incremental ao longo da cadeira:

- **Fase 1** — frontend Next.js completo com **dados mockados** numa camada `app/src/services/*`.
- **Fase 2 (atual)** — backend real: **servidor Node (Express + TypeScript) em `server/`**, PostgreSQL acessado com **`pg` + SQL escrito à mão (sem ORM)** — decisão do professor: "deixamos o ORM Prisma para quando formos reestruturar o projeto". Cada módulo do backend substitui o `service` mockado correspondente por chamadas HTTP reais.
- **Fases futuras** — reestruturação arquitetural (reintroduzir um ORM, extrair os jobs agendados para um worker/fila separado, dividir módulos em serviços). Cada evolução fica registrada em `PLAN.md` e `decisoes.md`.

`app/prisma/schema.prisma` e `db/diagram.dbml` permanecem como artefatos de design para essa fase futura; **`db/schema.sql` é a fonte da verdade viva do schema.**

## Documentação

- [`docs/Infohub_InovAMF_Requisitos.md`](docs/Infohub_InovAMF_Requisitos.md) — documento de requisitos original (convertido do PDF fornecido pela coordenação).
- [`docs/modelagem-banco.md`](docs/modelagem-banco.md) — modelagem do banco de dados (tabelas, relacionamentos, decisões Q1–Q7 aplicadas).
- [`docs/frontend-plan.md`](docs/frontend-plan.md) — plano do frontend com dados mockados: design system, telas, arquitetura de mocks/services.
- [`PLAN.md`](PLAN.md) — plano de execução da Fase 1: visão geral, arquitetura, definição de pronto e backlog de tickets.
- [`decisoes.md`](decisoes.md) — decisões de arquitetura registradas pela dupla (ex.: uso de ORM, stack de UI), conforme solicitado pelo professor.

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

## Como rodar (setup local)

Pré-requisitos: **Node 20+** e **Docker** (para o Postgres).

```bash
npm run install:all          # instala dependências da raiz, de app/ e de server/
cp server/.env.example server/.env
cp app/.env.local.example app/.env.local

npm run db:up                # sobe o Postgres no Docker (porta 5432)
npm run db:reset             # aplica db/schema.sql num banco limpo
npm run db:seed              # popula dados de demo (todas as contas: senha "senha123")
#   atalho: npm run db:setup  = db:up + db:reset + db:seed

npm run dev                  # sobe front (:3000) e API (:3333) juntos (concurrently)
```

Contas do seed: `ana.souza@infohub.amf.br` (admin), `fernanda.ribeiro@infohub.amf.br` (mentor), `joao.alves@acad.amf.br` (aluno).

Outros scripts da raiz: `npm run build`, `npm run start`, `npm run lint` (app), `npm run typecheck` / `npm test` (server), `npm run db:down`.

### Testes

```bash
cd server && npm test        # vitest: regras do funil (RN-01), jobs (RN-04/RF-17), fluxo de auth
```

O teste de auth é de integração e usa o banco populado — rode `npm run db:setup` antes.

### Jobs agendados

`server/src/jobs/scheduler.ts` roda dentro do processo da API (`setInterval`, 5 min): marca tarefas vencidas como `LATE` (RN-04) e dispara lembretes cuja data chegou (RF-17). É um módulo isolado de propósito — candidato natural a virar um worker separado na fase de reestruturação.

## Status

Backend (Fase 2) implementado — ver o estado dos tickets B0–B8 em [`PLAN.md`](PLAN.md).
