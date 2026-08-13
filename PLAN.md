# PLAN.md — InfoHub → InovAMF

## 1. Overview

Construir o **InfoHub → InovAMF**, um sistema web que digitaliza o acompanhamento da jornada do empreendedor no laboratório InfoHub da Faculdade Antonio Meneghetti (FAMF). O sistema substitui o acompanhamento manual (planilhas + WhatsApp) por um painel onde administradores/mentores gerenciam o funil de 6 etapas de cada equipe, atribuem tarefas com prazo, recebem entregáveis e disparam lembretes automáticos por e-mail; alunos acompanham suas tarefas e enviam arquivos em uma área própria.

Este é o projeto prático da disciplina de **Arquitetura de Sistemas** (graduação em Sistemas de Informação, FAMF). A disciplina é guiada em fases: a **Fase 1 (este plano)** entrega o sistema como **monolito**; fases futuras (fora deste PLAN.md, tratadas em revisões posteriores) irão refatorar incrementalmente partes do monolito para arquiteturas mais avançadas (ex.: extrair o disparo de notificações para um worker/fila dedicado, separar módulos em serviços independentes), conforme o conteúdo da cadeira avançar.

Sucesso para a Fase 1: um monolito rodando localmente (e com deploy simples), cobrindo o fluxo completo do documento de requisitos (`docs/Infohub_InovAMF_Requisitos.md`) — cadastro do aluno, funil de 6 etapas, tarefas com upload de arquivo, lembretes por e-mail e dashboard — com autenticação e persistência real em Postgres via TypeORM.

## 2. Non Goals

- Submissão automática ao edital do InovAMF (fora de escopo também no documento de requisitos — RF/OBJ não cobrem isso).
- Comunicação via WhatsApp (v1 cobre apenas e-mail).
- Agendamento/videochamada integrados para encontros com mentores.
- Qualquer separação em microsserviços, filas externas (RabbitMQ/Kafka) ou múltiplos deploys — isso é trabalho de fases futuras da disciplina, não desta Fase 1.
- Multi-tenancy (o sistema atende apenas a FAMF/InfoHub, uma instância única).
- Aplicativo mobile nativo (apenas web responsivo, RNF-01).
- Internacionalização (apenas português).

## 3. Assumptions

- **A1** — Q1 (login de integrante) resolvido como: apenas o aluno líder tem login na Fase 1; integrantes são cadastrados como dados (não como contas), reavaliável depois com a turma.
- **A2** — Q2 (perfil de mentor) resolvido como: mentor é um papel (`role`) dentro da tabela de usuários administrativos, com escopo restrito às equipes atribuídas a ele — não é uma entidade separada.
- **A3** — Q3 (Pitch Vídeo) resolvido como: aceito como **link externo** (YouTube/Drive) na Fase 1, evitando lidar com upload/streaming de vídeo grande; upload de arquivo de vídeo fica como melhoria futura.
- **A4** — Q4 (múltiplas equipes por aluno) resolvido como: um aluno participa de **no máximo uma equipe ativa** por vez (RN-03), reforçado por constraint na aplicação.
- **A5** — Q5 (máximo de integrantes por equipe): sem limite rígido na Fase 1; campo repetível sem teto (ajustável depois).
- **A6** — Q6 (pós-InovAMF): fora de escopo da Fase 1; o funil termina no status "Pronto para o InovAMF".
- **A7** — Q7 (serviço de e-mail): usar um serviço transacional de e-mail com boa oferta de free tier para ambiente acadêmico (ex.: Resend ou similar via SMTP), configurável por variável de ambiente — decisão final registrada em `decisoes.md`.
- **A8** — Deploy alvo: Vercel (Next.js) + Postgres gerenciado (ex.: Neon, já integrado ao ecossistema Vercel), já que o projeto roda com as skills Vercel disponíveis no ambiente.
- **A9** — Sem prazo de entrega fixo informado; tickets são sequenciados por dependência técnica, não por data.
- **A10** — Armazenamento de arquivos (RNF-04) via serviço de blob storage compatível com Vercel (Vercel Blob) em vez de disco local, para funcionar em ambiente serverless.

## 4. Constraints

- **Stack obrigatória** (decisão da dupla, registrada em `decisoes.md`): Next.js (App Router, API Routes/Server Actions) + TypeScript + **TypeORM** + PostgreSQL.
  - ORM: TypeORM foi escolhido pela dupla. Trade-off assumido: TypeORM tem integração menos "nativa" com ambientes serverless/edge (pool de conexões, cold starts) comparado a drivers mais leves, e sua tipagem/DX é historicamente menos polida que a do Prisma — aceito em troca de decorators/Active Record ou Data Mapper familiares a quem já viu ORMs orientados a objeto em outras linguagens (ex.: Hibernate).
- **Arquitetura**: monolito único, um único processo de deploy. Módulos internos devem ser organizados em camadas/pastas claramente separadas (ver Seção 5) para que a refatoração futura para arquiteturas mais avançadas seja possível sem reescrever tudo.
- **Autenticação**: dois tipos de login (aluno vs. administrador/mentor), e-mail+senha, com hashing de senha (bcrypt/argon2) — sem exigência de SSO/OAuth institucional nesta fase.
- **LGPD (RNF-02)**: consentimento explícito no formulário de cadastro do aluno; dados pessoais tratados com política de retenção documentada.
- **Contexto acadêmico**: o código deve ser legível e didático — decisões arquiteturais devem ser documentadas (`decisoes.md`, ADRs leves), pois a disciplina avalia o raciocínio, não só o resultado.
- **Sem orçamento** para serviços pagos — priorizar free tiers (Neon, Vercel Hobby, Resend free tier etc.).

## 5. Architecture Sketch

**Estilo**: Monolito modular em Next.js, com separação de camadas dentro do mesmo processo de deploy, preparando o terreno para extração futura de módulos.

```
src/
  app/                    # Next.js App Router — páginas e rotas
    (public)/              # login, cadastro do aluno (formulário inicial)
    (aluno)/                # área do aluno: tarefas, envio de arquivos
    (admin)/                # painel do administrador: funil, tarefas, relatórios
    api/                    # Route Handlers (se necessário além de Server Actions)
  modules/                # Núcleo de domínio, organizado por bounded context
    auth/                   # autenticação, sessão, papéis (admin/mentor/aluno)
    teams/                  # cadastro de equipe/ideia, integrantes
    journey/                # funil de 6 etapas, transições de estado (RN-01)
    tasks/                  # tarefas, prazos, status, aprovação/reprovação
    files/                  # upload, versionamento de arquivos entregues
    notifications/          # disparo de e-mail, agendamento de lembretes
    reports/                # dashboard, agregações, export CSV
    audit/                  # log de auditoria (RNF-05)
  infra/
    db/                     # data source TypeORM, entities, migrations
    email/                  # cliente do serviço transacional de e-mail
    storage/                # cliente de blob storage
  shared/                 # tipos, utils, validação (zod) compartilhados
```

- **Fluxo de dados**: UI (Server/Client Components) → Server Actions/Route Handlers → camada de `modules/*` (regras de negócio) → TypeORM repositories → Postgres.
- **Notificações (RF-17/18)**: dentro do monolito, um job agendado (cron da Vercel ou equivalente) varre tarefas com lembretes configurados e dispara e-mails via `infra/email`. Este é o módulo mais provável de virar um worker/fila separado em fases futuras da disciplina — por isso já nasce isolado em `modules/notifications`.
- **Auditoria**: toda mudança de etapa, aprovação/reprovação de tarefa e disparo de e-mail grava um registro em `modules/audit`, consumido pelo dashboard e por trilhas de rastreabilidade (RNF-05).
- **Máquina de estados do funil**: `modules/journey` centraliza as transições válidas entre as 6 etapas (RN-01), evitando que a lógica de avanço/retrocesso fique espalhada pela UI.
- **Integrações externas**: serviço de e-mail transacional (A7), blob storage (A10). Nenhuma integração com sistema acadêmico ou InovAMF nesta fase (Seção 8 do documento de requisitos é backlog futuro).

## 6. Definition of Done

- **Build**: `npm run build` completa sem erros; `npm run lint` e `tsc --noEmit` sem erros.
- **Banco**: migrations do TypeORM aplicam limpo em um Postgres vazio (`npm run migration:run`); seed mínimo (1 admin, 1 aluno, 1 equipe de exemplo) disponível via script.
- **Testes**: suíte de testes cobre pelo menos a máquina de estados do funil (`modules/journey`) e as regras de negócio críticas (RN-01 a RN-04); `npm test` passa.
- **Rodar localmente**: `npm run dev` sobe a aplicação; login de aluno e de admin funcionam; fluxo completo executável manualmente: aluno se cadastra (Etapa 1) → admin avança até Etapa 6 aprovando tarefas → equipe marcada como "Pronta para o InovAMF".
- **Validação de usuário**: checklist manual de RF-01 a RF-24 executado uma vez contra a aplicação rodando, com resultado documentado (mesmo que informalmente, em um checklist).
- **Documentação**: `README.md` atualizado com instruções de setup, `decisoes.md` com as decisões de arquitetura tomadas (ORM e demais que a turma for definindo), `PLAN.md` com tickets refletindo o estado real do backlog.

## 7. Task Backlog

### Ticket: T001 Setup do projeto Next.js + TypeScript
- **Priority:** P0
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Inicializar projeto Next.js (App Router) com TypeScript, ESLint, estrutura de pastas descrita na Seção 5.
- **Acceptance Criteria:** `npm run dev` sobe uma página inicial; `npm run lint` e `npm run build` passam sem erro.
- **Validation Steps:** `npm install && npm run build && npm run dev`
- **Notes:**

### Ticket: T002 Configurar Postgres + TypeORM (data source e conexão)
- **Priority:** P0
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Configurar `infra/db/data-source.ts` com TypeORM apontando para Postgres (local via Docker Compose ou Neon), variáveis de ambiente em `.env`.
- **Acceptance Criteria:** Aplicação conecta ao banco na inicialização sem erro; conexão testável via script simples.
- **Validation Steps:** Script `npm run db:check` (ou equivalente) conecta e retorna sucesso.
- **Notes:** Registrar em `decisoes.md` a escolha entre Postgres local (Docker) vs. Neon para desenvolvimento.

### Ticket: T003 Modelagem de entidades TypeORM (schema inicial)
- **Priority:** P0
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Criar entities TypeORM para: `User` (admin/mentor/aluno), `Team`, `TeamMember`, `Idea`, `JourneyStage`/`TeamStageStatus`, `Task`, `TaskSubmission` (arquivo), `AuditLog`.
- **Acceptance Criteria:** Entities cobrem os campos descritos na Seção 4.2 e 4.4 do documento de requisitos; migration inicial gerada.
- **Validation Steps:** `npm run migration:generate -- InitialSchema` roda sem erro; `npm run migration:run` aplica em banco limpo.
- **Notes:**

### Ticket: T004 Autenticação (login separado aluno/admin)
- **Priority:** P0
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Implementar login com e-mail/senha (hash bcrypt/argon2), sessão (ex.: cookies HTTP-only ou next-auth com Credentials provider), separação de rotas por papel.
- **Acceptance Criteria:** RF-01 atendido: login funciona para aluno e para admin/mentor, com recuperação de senha básica.
- **Validation Steps:** Teste manual de login com usuário seed; teste automatizado de autenticação com credenciais inválidas/válidas.
- **Notes:**

### Ticket: T005 Formulário inicial do aluno (Etapa 1 — cadastro de ideia)
- **Priority:** P0
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Formulário público com todos os campos da Seção 4.2, validação client+server (zod), criação automática de conta do aluno líder e do registro da equipe na Etapa 1 (RF-02, RF-04, RF-05).
- **Acceptance Criteria:** Envio válido cria `User` (aluno), `Team`, `TeamMember`(s) e posiciona a equipe na Etapa 1; envio inválido bloqueia com mensagens de erro.
- **Validation Steps:** Teste de integração cobrindo submissão válida e inválida; verificação manual no banco após submit.
- **Notes:** Dispara e-mail ao admin (depende de T010, pode ser stub inicialmente).

### Ticket: T006 Máquina de estados do funil (6 etapas)
- **Priority:** P0
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Implementar `modules/journey` com as transições válidas entre as 6 etapas, incluindo avanço/retrocesso manual pelo admin (RF-09) e regra RN-01 (só avança com tarefas obrigatórias aprovadas).
- **Acceptance Criteria:** Transições inválidas são rejeitadas; transição válida atualiza o status da equipe e grava no audit log.
- **Validation Steps:** Testes unitários cobrindo cada transição permitida/proibida da máquina de estados.
- **Notes:**

### Ticket: T007 Painel do administrador — visão em funil/kanban
- **Priority:** P0
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Tela com todas as equipes agrupadas por etapa (RF-06), busca e filtros (RF-07).
- **Acceptance Criteria:** Painel lista equipes reais do banco, agrupadas corretamente por etapa; filtros por nome, curso, área e status de tarefa funcionam.
- **Validation Steps:** Teste manual com seed de múltiplas equipes em etapas diferentes.
- **Notes:**

### Ticket: T008 Página de detalhe da equipe
- **Priority:** P1
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Página com dados cadastrais, histórico de etapas, tarefas atribuídas, arquivos entregues e anotações internas do mentor (RF-08, RF-10).
- **Acceptance Criteria:** Todos os dados da equipe aparecem corretamente; anotações internas não são visíveis na área do aluno.
- **Validation Steps:** Teste manual comparando view do admin vs. view do aluno para a mesma equipe.
- **Notes:**

### Ticket: T009 CRUD de tarefas + templates por etapa
- **Priority:** P0
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Admin cria tarefas (avulsas ou via template pré-configurado por etapa), com título, descrição, etapa relacionada, prazo e status (RF-11, RF-12).
- **Acceptance Criteria:** Tarefa criada aparece na área do aluno correspondente; status transiciona corretamente (pendente → em andamento → entregue → aprovada/reprovada).
- **Validation Steps:** Teste de integração criando tarefa e verificando visibilidade na área do aluno.
- **Notes:**

### Ticket: T010 Área do aluno — lista de tarefas e envio de arquivos
- **Priority:** P0
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Tela do aluno com tarefas pendentes/concluídas (RF-13), upload de um ou mais arquivos por tarefa (RF-14) usando blob storage (A10).
- **Acceptance Criteria:** Aluno vê apenas suas próprias tarefas; upload persiste arquivo e associa à tarefa; RNF-04 respeitado (tipo/tamanho validados).
- **Validation Steps:** Teste manual de upload de PDF válido e de arquivo além do limite (deve ser rejeitado).
- **Notes:**

### Ticket: T011 Aprovação/reprovação de entregas + histórico de versões
- **Priority:** P1
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Admin aprova (RF-15) ou solicita ajuste (reabre tarefa com comentário); reenvio de arquivo mantém histórico de versões (RF-16).
- **Acceptance Criteria:** Aprovação marca tarefa como concluída e contribui para RN-01; reprovação reabre a tarefa e notifica o aluno (integração com T012).
- **Validation Steps:** Teste de integração: reprovar → aluno reenvia → nova versão registrada, versão anterior preservada.
- **Notes:**

### Ticket: T012 Módulo de notificações por e-mail (transacionais + lembretes)
- **Priority:** P0
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** `modules/notifications` com envio de e-mail para: nova tarefa atribuída, aprovação/reprovação, novo cadastro (admin), arquivo entregue (admin) — RF-18, RF-19.
- **Acceptance Criteria:** Cada evento de negócio relevante dispara o e-mail correto (verificável em ambiente de teste/sandbox do provedor de e-mail).
- **Validation Steps:** Teste de integração com provedor de e-mail em modo sandbox/mock; log de envio conferido no audit log.
- **Notes:** Depende de A7 (escolha final do provedor, a registrar em `decisoes.md`).

### Ticket: T013 Lembretes automáticos agendados
- **Priority:** P1
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Configuração de datas de lembrete por tarefa (RF-17) e job agendado que varre tarefas e dispara lembretes (RF-18 parte de prazo próximo/vencido), incluindo lembrete manual avulso (RF-20).
- **Acceptance Criteria:** Job identifica corretamente tarefas com lembrete devido e dispara e-mail uma única vez por data configurada; lembrete manual funciona sob demanda.
- **Validation Steps:** Teste unitário do cálculo de "lembretes devidos" dado um conjunto de tarefas e datas mockadas.
- **Notes:** Módulo isolado de propósito — candidato natural a extração futura para worker separado (mencionar no README/ADR).

### Ticket: T014 Regra RN-04 — marcação automática de tarefas atrasadas
- **Priority:** P1
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Job (pode reaproveitar o agendador de T013) marca tarefas vencidas sem entrega como "atrasada" e sinaliza no painel.
- **Acceptance Criteria:** Tarefa com prazo vencido e sem entrega muda de status automaticamente; painel do admin reflete isso (RF-07 filtro por atrasada).
- **Validation Steps:** Teste unitário com tarefa de prazo no passado sem submissão.
- **Notes:**

### Ticket: T015 Dashboard com indicadores gerais
- **Priority:** P1
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Tela com total de equipes ativas, distribuição por etapa, tarefas atrasadas, equipes prontas para o InovAMF (RF-22).
- **Acceptance Criteria:** Números batem com os dados reais do banco (conferíveis via query manual).
- **Validation Steps:** Teste de integração comparando contagens do dashboard com contagens diretas no banco.
- **Notes:**

### Ticket: T016 Exportação CSV/Excel
- **Priority:** P2
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Botão de exportação da lista de equipes/ideias e status (RF-23), com filtro por período/turma (RF-24).
- **Acceptance Criteria:** Arquivo exportado abre corretamente em Excel/planilha e contém os dados filtrados esperados.
- **Validation Steps:** Teste manual de download e abertura do arquivo gerado.
- **Notes:**

### Ticket: T017 Controle de acesso e escopo de dados por papel
- **Priority:** P0
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Middleware/guards garantindo que aluno só veja dados da própria equipe e mentor só veja equipes sob sua mentoria (RNF-03, A2).
- **Acceptance Criteria:** Tentativa de acessar dados de outra equipe (via URL direta ou API) retorna erro de autorização.
- **Validation Steps:** Teste de integração tentando acessar recurso de outra equipe autenticado como aluno/mentor sem permissão.
- **Notes:**

### Ticket: T018 Log de auditoria
- **Priority:** P1
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** `modules/audit` registrando mudanças de etapa, aprovações/reprovações e envios de e-mail (RNF-05).
- **Acceptance Criteria:** Cada evento relevante gera uma entrada de audit log consultável (ao menos via query, painel de auditoria é opcional na Fase 1).
- **Validation Steps:** Teste de integração verificando criação de registro de auditoria após cada ação relevante.
- **Notes:**

### Ticket: T019 Consentimento LGPD no cadastro
- **Priority:** P1
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Checkbox de consentimento obrigatório no formulário inicial (T005), com registro de data/hora do consentimento (RNF-02).
- **Acceptance Criteria:** Envio sem consentimento marcado é bloqueado; consentimento é persistido com timestamp.
- **Validation Steps:** Teste de integração cobrindo tentativa de envio sem marcar o consentimento.
- **Notes:**

### Ticket: T020 Layout responsivo mobile-first (área do aluno)
- **Priority:** P1
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Ajustar UI da área do aluno para mobile-first (RNF-01), já que tende a ser acessada via celular.
- **Acceptance Criteria:** Fluxo completo do aluno (login, tarefas, upload) é utilizável em viewport mobile sem quebra de layout.
- **Validation Steps:** Teste manual em DevTools com viewport mobile (ex.: 375px) cobrindo as telas do aluno.
- **Notes:**

### Ticket: T021 Seed de dados e script de setup local
- **Priority:** P0
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Script de seed criando 1 admin, 1 mentor, 1 aluno com equipe em cada etapa (para facilitar demonstração/avaliação em sala).
- **Acceptance Criteria:** `npm run seed` popula o banco local de forma idempotente.
- **Validation Steps:** Rodar `npm run seed` duas vezes seguidas sem erro nem duplicação indevida.
- **Notes:**

### Ticket: T022 Testes automatizados das regras de negócio críticas
- **Priority:** P0
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Suíte de testes (ex.: Vitest/Jest) cobrindo RN-01 a RN-04 e a máquina de estados do funil.
- **Acceptance Criteria:** `npm test` roda e passa cobrindo os cenários de regra de negócio descritos na Seção 6 do documento de requisitos.
- **Validation Steps:** `npm test` com relatório de cobertura mínima nos módulos `journey` e `tasks`.
- **Notes:**

### Ticket: T023 README.md e decisoes.md atualizados
- **Priority:** P0
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Documentar setup do projeto, contexto acadêmico e decisões de arquitetura (ORM e demais) tomadas pela dupla.
- **Acceptance Criteria:** Um colega consegue clonar o repo, seguir o README e rodar o projeto localmente do zero.
- **Validation Steps:** Seguir o README passo a passo em uma checagem manual (ou pedir a outra pessoa para seguir).
- **Notes:**

### Ticket: T024 Deploy inicial (Vercel + Postgres gerenciado)
- **Priority:** P2
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** Deploy da Fase 1 em ambiente hospedado (A8), com variáveis de ambiente configuradas (banco, e-mail, storage).
- **Acceptance Criteria:** Aplicação acessível publicamente executa o fluxo completo de ponta a ponta.
- **Validation Steps:** Smoke test manual em produção: cadastro de aluno → login admin → avanço de etapa.
- **Notes:**

## 8. Open Questions

- **OQ1** — A escolha final do provedor de e-mail transacional (A7) depende do que a coordenação/turma padronizar; hoje assumido como decisão por dupla, a alinhar depois.
- **OQ2** — Se e quando a turma padronizar Postgres gerenciado (Neon vs. outro), isso pode mudar T002/T024.
- **OQ3** — O professor pode definir um formato específico para o registro de decisões além de `decisoes.md` (ex.: ADRs numerados) — a confirmar com a disciplina.
- **OQ4** — As perguntas Q1–Q7 do documento de requisitos original foram resolvidas como assunções (Seção 3) apenas para viabilizar a Fase 1; a coordenação do InfoHub pode decidir diferente, exigindo ajuste de escopo depois.
- **OQ5** — Critérios de avaliação da disciplina para a Fase 1 (o que exatamente será cobrado como "monolito completo") ainda não foram detalhados neste plano — ajustar Definition of Done conforme o professor especificar.

## 9. Discovered Issues Log

> _New issues must be appended here with a timestamp and brief context._
