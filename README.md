# InfoHub → InovAMF

Sistema de acompanhamento da jornada do empreendedor no laboratório **InfoHub** da Faculdade Antonio Meneghetti, digitalizando o funil de 6 etapas até o encaminhamento ao centro de inovação **InovAMF**.

Este repositório é o projeto prático da disciplina de **Arquitetura de Sistemas**, do curso de graduação em Sistemas de Informação. O sistema é construído de forma incremental ao longo da cadeira:

- **Fase 1 (atual)** — o sistema é implementado como um **monolito**.
- **Fases futuras** — trechos do monolito serão refatorados para arquiteturas mais avançadas (ex.: extrair notificações para um worker/fila separado, dividir módulos em serviços independentes), conforme o conteúdo da disciplina avançar. Cada evolução será documentada em `PLAN.md` e `decisoes.md`.

## Documentação

- [`docs/Infohub_InovAMF_Requisitos.md`](docs/Infohub_InovAMF_Requisitos.md) — documento de requisitos original (convertido do PDF fornecido pela coordenação).
- [`PLAN.md`](PLAN.md) — plano de execução da Fase 1: visão geral, arquitetura, definição de pronto e backlog de tickets.
- [`decisoes.md`](decisoes.md) — decisões de arquitetura registradas pela dupla (ex.: uso de ORM), conforme solicitado pelo professor.

## Stack (Fase 1 — monolito)

- **Next.js** (App Router) + **TypeScript**
- **Prisma** como ORM, sobre **PostgreSQL** (ver justificativa e trade-offs em [`decisoes.md`](decisoes.md))
- Deploy alvo: Vercel + Postgres gerenciado

## Estrutura do projeto

```
src/
  app/          # Next.js App Router — páginas e rotas (público, aluno, admin)
  modules/      # Núcleo de domínio por contexto: auth, teams, journey, tasks, files, notifications, reports, audit
  infra/        # Integrações técnicas: banco (Prisma), e-mail, storage
  shared/       # Tipos e utilitários compartilhados
docs/           # Documentação de requisitos
```

A separação em `modules/` por contexto de negócio existe propositalmente para facilitar a evolução arquitetural nas próximas fases da disciplina.

## Como rodar (setup local)

> Instruções serão detalhadas conforme o projeto for implementado (ver `PLAN.md`, tickets T001–T003). Resumo esperado:

```bash
npm install
cp .env.example .env   # configurar conexão com Postgres, e-mail e storage
npx prisma migrate deploy
npm run seed
npm run dev
```

## Status

Em planejamento — ver o backlog de tickets em [`PLAN.md`](PLAN.md) para o estado atual do desenvolvimento.
