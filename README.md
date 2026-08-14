# InfoHub → InovAMF

Sistema de acompanhamento da jornada do empreendedor no laboratório **InfoHub** da Faculdade Antonio Meneghetti, digitalizando o funil de 6 etapas até o encaminhamento ao centro de inovação **InovAMF**.

Este repositório é o projeto prático da disciplina de **Arquitetura de Sistemas**, do curso de graduação em Sistemas de Informação. O sistema é construído de forma incremental ao longo da cadeira:

- **Fase 1 (atual)** — o sistema é implementado como um **monolito**.
- **Fases futuras** — trechos do monolito serão refatorados para arquiteturas mais avançadas (ex.: extrair notificações para um worker/fila separado, dividir módulos em serviços independentes), conforme o conteúdo da disciplina avançar. Cada evolução será documentada em `PLAN.md` e `decisoes.md`.

## Documentação

- [`docs/Infohub_InovAMF_Requisitos.md`](docs/Infohub_InovAMF_Requisitos.md) — documento de requisitos original (convertido do PDF fornecido pela coordenação).
- [`docs/modelagem-banco.md`](docs/modelagem-banco.md) — modelagem do banco de dados (tabelas, relacionamentos, decisões Q1–Q7 aplicadas).
- [`docs/frontend-plan.md`](docs/frontend-plan.md) — plano do frontend com dados mockados: design system, telas, arquitetura de mocks/services.
- [`PLAN.md`](PLAN.md) — plano de execução da Fase 1: visão geral, arquitetura, definição de pronto e backlog de tickets.
- [`decisoes.md`](decisoes.md) — decisões de arquitetura registradas pela dupla (ex.: uso de ORM, stack de UI), conforme solicitado pelo professor.

## Stack (Fase 1 — monolito)

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS + shadcn/ui** na camada de interface
- **Prisma** como ORM, sobre **PostgreSQL** (ver justificativa e trade-offs em [`decisoes.md`](decisoes.md))
- Deploy alvo: Vercel + Postgres gerenciado

## Estrutura do repositório

A aplicação Next.js inteira (front + back, um único deploy — regra da disciplina) vive em `app/`. A raiz do repositório fica reservada para documentação e artefatos que não são código da aplicação (requisitos, modelagem de banco, decisões), evitando misturar tudo solto num só nível.

```
app/                # aplicação Next.js completa (monolito)
  src/
    app/              # Next.js App Router — páginas e rotas (público, aluno, admin)
    modules/          # Núcleo de domínio por contexto: auth, teams, journey, tasks, files, notifications, reports, audit
    infra/            # Integrações técnicas: banco (Prisma), e-mail, storage
    shared/           # Tipos e utilitários compartilhados
    components/       # Componentes de UI (ui/ = shadcn, <domínio>/ = componentes de negócio)
    services/         # Camada de acesso a dados (mock hoje, API/Prisma depois — ver docs/frontend-plan.md)
  prisma/             # schema.prisma, migrations
  package.json
db/                 # DDL (schema.sql) e DER (diagram.dbml) de referência
docs/               # documentação (requisitos, modelagem de banco, plano de frontend)
assets/             # logotipo e outros ativos de marca
package.json        # raiz — delega os scripts pra app/ (ver "Como rodar")
```

A separação em `modules/`/`services/` por contexto de negócio existe propositalmente para facilitar a evolução arquitetural nas próximas fases da disciplina.

## Como rodar (setup local)

O `package.json` da raiz delega para `app/`, então o projeto sobe com um comando só a partir da raiz (regra da disciplina: sem back e front separados):

```bash
npm run install:app     # instala as dependências dentro de app/ (equivalente a cd app && npm install)
cp app/.env.example app/.env   # configurar conexão com Postgres, e-mail e storage (quando existir)
npm run dev              # delega para "next dev" dentro de app/
```

Demais scripts disponíveis na raiz: `npm run build`, `npm run start`, `npm run lint` — todos delegam para `app/`.

## Status

Em planejamento — ver o backlog de tickets em [`PLAN.md`](PLAN.md) para o estado atual do desenvolvimento.
