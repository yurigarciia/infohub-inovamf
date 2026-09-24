# Guia de estudo — como o InfoHub → InovAMF funciona

Feito para você conseguir **explicar o sistema de cabeça** na demo: o que cada
parte faz, como uma requisição percorre o código, qual endpoint chama cada
funcionalidade e por que as decisões foram tomadas. Leia na ordem; cada seção
termina com o que o professor provavelmente pergunta.

---

## 1. O sistema em 30 segundos

O InfoHub acompanha equipes de alunos que têm uma ideia de negócio e passam por
um **funil de 6 etapas** até ficarem "prontas para o InovAMF" (evento de
inovação). Há três papéis:

| Papel | O que faz |
|---|---|
| **Aluno** (líder/integrante) | cadastra a equipe, vê suas tarefas, **entrega** arquivo ou link |
| **Mentor** | acompanha as equipes atribuídas a ele, cria tarefas, avalia entregas, move etapa |
| **Administrador** | tudo do mentor em todas as equipes + gerencia contas de mentor/admin, auditoria, dashboard |

**As 6 etapas:** 1 Envio da ideia → 2 Contato com a equipe → 3 Encontro 1
(entendendo a ideia) → 4 Encontro 2 (proposta de valor) → 5 Encontro 3 (modelo
de negócio) → 6 Encontro 4 (pitch e inscrição).

---

## 2. Arquitetura (o slide principal)

```
Navegador ──► Next.js (porta 3000, ÚNICA exposta)
                 │  páginas (React)
                 └─ /api/*  e  /uploads/*  ──(rewrite, proxy interno)──► API Express (porta 3333, interna)
                                                                              │  SQL puro (pg)
                                                                              ▼
                                                        PostgreSQL do professor — schema infohub_yuri
```

- **Um único resource no Coolify** (exigência do professor): o mesmo container
  roda front e back. `entrypoint.sh` prepara o banco e sobe os dois com
  `concurrently`.
- O browser só conhece **uma origem**. Chamadas vão para `/api/...`; o Next
  reescreve para a API interna (`app/next.config.ts`). Consequência: **sem CORS**
  e o cookie de sessão é simples.
- **Sem ORM.** O professor pediu para não usar Prisma agora: acesso ao banco com
  `pg` (node-postgres) e **SQL escrito à mão**, sempre com parâmetros (`$1, $2`).
- Stack: Next.js 16 + React + Tailwind/shadcn (front); Express 5 + TypeScript +
  zod (validação) + bcryptjs + jsonwebtoken + multer (upload) (back); vitest +
  supertest (testes).

### As camadas do back-end (decore isto)

Cada módulo em `server/src/modules/<nome>/` segue o mesmo padrão:

```
routes  →  controller  →  service  →  repository
(URL)      (HTTP + zod)   (regra)     (SQL)
```

| Camada | Responsabilidade | NÃO faz |
|---|---|---|
| `*.routes.ts` | liga URL + método aos middlewares e ao controller | lógica |
| `*.controller.ts` | lê `req`, **valida com zod**, chama o service, monta a resposta | regra de negócio |
| `*.service.ts` | **regras de negócio**, transações, auditoria, notificações | SQL, HTTP |
| `*.repository.ts` | **só SQL** (`SELECT/INSERT/UPDATE`), converte snake_case → camelCase | regras |

Por que assim? Isolar o SQL: quando o Prisma entrar, só os `repository`
mudam. O `service` é o lugar certo para "onde está a regra X?".

Arquivos transversais: `middleware/auth.ts` (valida o JWT), `requireRole.ts`
(guard por papel), `errorHandler.ts` (erro → HTTP), `rateLimit.ts`,
`shared/sql.ts` (`query`, `maybeOne`, `one`, `tx` para transação),
`shared/errors.ts` (`NotFoundError`, `ForbiddenError`, `ConflictError`…),
`shared/validation.ts` (validadores zod reutilizados).

### Ciclo de vida de uma requisição — exemplo: "mentor avalia uma entrega"

1. Front chama `POST /api/submissions/:id/review` (`app/src/services/tasks.service.ts` → `reviewSubmission`, via `apiFetch` que injeta o JWT).
2. Next reescreve para a API.
3. `tasks.routes.ts`: passa por `authRequired` (JWT válido?) e `requireRole("ADMIN","MENTOR")`.
4. `tasks.controller.ts → review`: zod valida `{ decision, reviewComment }`.
5. `tasks.service.ts → reviewSubmission`: abre **transação**, trava a linha da tarefa (`FOR UPDATE`), confere se é a versão atual, grava a decisão, atualiza `tasks.status`, recalcula a prontidão da equipe, escreve em `audit_logs` e cria a notificação por e-mail.
6. Resposta JSON. Se algo falha, o `errorHandler` devolve `{ error: { code, message } }` com o status certo.

---

## 3. Autenticação e autorização

**Login** (`POST /auth/login`, `auth.service.ts`)
- Senha comparada com **bcrypt** (hash em `users.password_hash`, nunca a senha).
- Devolve um **access token (JWT, ~15 min)**, *stateless*, que o front guarda **só em memória** e manda em `Authorization: Bearer …`.
- E um **refresh token** (aleatório, 32 bytes) num **cookie httpOnly** `infohub_rt`. No banco fica só o **hash SHA-256** (`refresh_tokens`).

**Refresh** (`POST /auth/refresh`)
- Cada uso **rotaciona**: o token antigo é revogado (`revoked_at`, `replaced_by_id`) e um novo é emitido.
- **Detecção de reuso**: se alguém apresenta um token já revogado, toda a cadeia de sessões daquele usuário é derrubada (sinal de roubo).
- No front (`lib/api-client.ts`): ao receber 401, tenta um refresh e repete a chamada; várias chamadas simultâneas compartilham **um** refresh (*single-flight*).

**Por que JWT curto + refresh opaco?** JWT stateless é barato de validar mas
não dá para revogar; então dura pouco. O refresh fica no banco e pode ser
revogado. Cookie `httpOnly` impede JavaScript de ler o refresh (mitiga XSS).

**Primeiro acesso / esqueci a senha** (`POST /auth/password-reset` e `/confirm`)
- Gera token de uso único em `password_reset_tokens` (validade 7 dias no primeiro acesso, 1 h no reset) e manda o link `APP_URL/definir-senha?token=…` por e-mail.
- O pedido **sempre responde 204** (não revela se o e-mail existe).

**Autorização em dois níveis**
1. **Por papel** — `requireRole("ADMIN","MENTOR")` na rota.
2. **Por escopo/equipe (RNF-03)** — dentro do service: aluno só vê as equipes das quais é integrante; mentor só as atribuídas a ele (`team_mentors`); admin vê tudo. Fora do escopo → 403.

**Rate limit:** login e reset limitam tentativas por IP (resposta 429).

**No front**, `RequireRole` (nos layouts `/admin`, `/aluno`, `/equipes`) manda quem não tem papel para o login. É conforto de UX; **a barreira real é a API**.

---

## 4. Mapa de funcionalidades → endpoints

Base: `/api` (no browser) ou `:3333` (direto na API). "Staff" = ADMIN ou MENTOR.
`RF-xx` são os requisitos do documento de requisitos.

| Funcionalidade | Endpoint | Quem | Onde está a regra |
|---|---|---|---|
| Healthcheck | `GET /health` | público | `app.ts` |
| Login (RF-01) | `POST /auth/login` | público | `auth.service` |
| Renovar sessão | `POST /auth/refresh` | cookie | `auth.service` |
| Sair | `POST /auth/logout` | cookie | `auth.service` |
| Definir/recuperar senha | `POST /auth/password-reset` e `/confirm` | público | `auth.service` |
| Quem sou eu | `GET /users/me` | logado | `users.service` |
| Contas de mentor/admin (RF-03) | `GET/POST /users/staff`, `PATCH /users/staff/:id`, `PATCH /users/staff/:id/active` | admin | `users.service` (trava de auto-desativação) |
| Lista de mentores (filtro) | `GET /users/mentors` | staff | `users.service` |
| Etapas, áreas, turmas | `GET /journey-stages`, `/idea-areas`, `/cohorts` | público | `reference.*` |
| **Cadastro da equipe (RF-02)** | `POST /teams` | público | `teams.service.createTeam` |
| **Funil / board (RF-06/07)** | `GET /teams?search=&course=&areaId=&cohort=&mentorId=&taskStatus=` | staff | `teams.repository` (WHERE dinâmico) |
| Minhas equipes | `GET /teams/mine` | aluno | `teams.service` |
| Detalhe da equipe (RF-08/10) | `GET /teams/:id` | staff ou membro | `teams.service` (escopo) |
| **Mudar de etapa (RF-09)** | `POST /teams/:id/stage` | staff | `journey.rules` (RN-01) + `teams.service` |
| Anotação interna (RF-10) | `POST /teams/:id/notes` | staff | `teams.service` |
| Modelos de tarefa (RF-11) | `GET /task-templates?stageId=` | staff | `tasks.service` |
| **Criar/editar tarefa (RF-11/12)** | `POST /tasks`, `PATCH /tasks/:id` | staff | `tasks.service` |
| Tarefas da equipe / do aluno (RF-13) | `GET /teams/:teamId/tasks`, `GET /tasks/mine` | conforme escopo | `tasks.service` |
| **Entregar (RF-14/16)** | `POST /tasks/:id/submissions` | aluno da equipe | `tasks.controller.submit` + `upload.ts` |
| **Avaliar entrega (RF-15)** | `POST /submissions/:id/review` | staff | `tasks.service.reviewSubmission` |
| **Lembretes (RF-17/20)** | `POST /tasks/:id/reminders` (`{remindAt}` agenda; `{manual:true}` dispara já) | staff | `tasks.service` |
| Auditoria (RNF-05) | `GET /audit-logs?limit=` | staff | `audit.*` |
| Notificações do usuário | `GET /notifications/mine?limit=` | logado | `notifications.*` |
| Dashboard (RF-22/24) | `GET /reports/dashboard?cohort=` | staff | `reports.repository` (COUNT/GROUP BY) |

Erros têm sempre o formato `{ "error": { "code", "message", "fields"? } }`:
400 validação, 401 sem sessão, 403 sem permissão/escopo, 404, 409 conflito,
429 muitas tentativas.

---

## 5. Regras de negócio (as perguntas "por que isso acontece?")

- **RN-01 — transição de etapa** (`journey/journey.rules.ts`, `assertTransitionAllowed`): destino entre 1 e 6, diferente da atual, e **no máximo 1 passo** (avança ou retrocede uma por vez). Ao mudar: fecha o registro da etapa anterior e abre o novo em `team_stage_history`, atualiza `teams.current_stage_id`, grava auditoria.
- **RN-04 — tarefa atrasada** (`jobs/rules.ts` + `jobs/scheduler.ts`): um agendador dentro do processo da API (`setInterval`, a cada 5 min) marca como `LATE` a tarefa aberta cujo prazo passou e **dispara os lembretes** que chegaram na hora. Está isolado em `jobs/` para virar worker separado no futuro.
- **Ciclo da tarefa:** `PENDING → IN_PROGRESS → SUBMITTED → APPROVED | REJECTED` (e `LATE` por prazo).
- **Entrega versionada:** cada envio cria uma nova versão; só a mais recente é `is_current = true`. **Só a versão atual pode ser avaliada** (409 nas antigas). O envio trava a linha da tarefa (`SELECT … FOR UPDATE`) para duas entregas simultâneas não gerarem duas "atuais".
- **Arquivo ou link:** upload (PDF, PNG, JPEG, MP4, até 50 MB) **ou** link externo (Pitch Vídeo — `is_external_link = true`; só `http/https`).
- **Segurança do upload** (`upload.ts`, `file-signature.ts`): tipo permitido por lista; a **extensão gravada vem do tipo**, não do nome do arquivo; a **assinatura real (magic bytes)** precisa bater com o tipo. Motivo: `/uploads` é servido na mesma origem do app, então um `.html` disfarçado seria perigoso.
- **Prontidão para o InovAMF** (`is_ready_for_inovamf`): equipe na etapa 6 **e** todas as tarefas da etapa 6 aprovadas. Recalculada ao criar tarefa, avaliar entrega e mudar de etapa.
- **Cadastro (RF-02):** find-or-create de aluno por e-mail (quem já existe não duplica; um aluno pode estar em 2 equipes), registra o consentimento LGPD (RNF-02), cria equipe + integrantes + histórico na etapa 1 e notifica o admin.
- **Prazo é data pura** (`YYYY-MM-DD`, sem fuso) de ponta a ponta — evita mostrar um dia antes.
- **Auditoria (RNF-05):** ações relevantes gravam quem, o quê e quando em `audit_logs`.
- **E-mail:** interface `EmailSender`; em produção usa o **mail-service** da dupla (hospedado no Render, que "dorme": o primeiro envio pode demorar). Por isso o envio é **em segundo plano com 4 tentativas** (esperas 4 s/15 s/45 s): o usuário não espera e o cold start só atrasa. Contas do seed usam domínios fictícios e **não** disparam e-mail real (`MAIL_SKIP_DOMAINS`).

---

## 6. Banco de dados

Fonte da verdade: `db/schema.sql`. Tabelas principais:

| Tabela | Para quê |
|---|---|
| `users` (+ `student_profiles`) | contas dos 3 papéis; aluno tem curso/período |
| `teams` | equipe e sua ideia; `current_stage_id`, `is_ready_for_inovamf` |
| `team_members` | quem está em qual equipe (`LEADER`/`MEMBER`) — N:N |
| `team_mentors` | quais mentores atendem qual equipe — N:N |
| `team_stage_history` | passagem por etapas (entrada/saída/quem mudou) |
| `team_notes` | anotações internas (só staff vê) |
| `journey_stages`, `idea_areas` | dados de referência |
| `task_templates`, `tasks` | modelos por etapa e tarefas reais |
| `task_submissions` | entregas versionadas + resultado da avaliação |
| `task_reminders` | lembretes agendados/manuais |
| `email_notifications` | histórico de e-mails (`SENT`/`FAILED`) |
| `audit_logs` | trilha de auditoria |
| `refresh_tokens`, `password_reset_tokens` | sessões e links de senha |

Pontos para citar: **soft delete** (`deleted_at`) em 9 tabelas com índices únicos
parciais; chaves `uuid`; relacionamentos N:N por tabela de junção.

**Banco compartilhado:** o Postgres é do professor, um **schema por dupla**. O
pool fixa o `search_path` em `DB_SCHEMA` (`infohub_yuri`) e só nele — o SQL não
usa prefixo e nada vaza para o `public`. Comandos destrutivos (`db:reset`,
`db:seed`) **recusam** o `public` e schemas que não sejam deste app
(`schema-guard.ts`).

---

## 7. Deploy e dados de demonstração

- **Coolify, um resource:** Install `npm install` (o `postinstall` instala `app/` e `server/`), Build `npm run build`, Start `./entrypoint.sh`, porta 3000.
- **`entrypoint.sh`** → `server/dist/db/bootstrap.js`: espera o Postgres, **cria o schema**, aplica `schema.sql` **só se vazio**, garante dados essenciais (áreas, modelos de tarefa), cria o **admin inicial** a partir de `ADMIN_EMAIL/ADMIN_PASSWORD` e, com `SEED_ON_INIT=true` e banco sem usuários, **popula o cenário de demo**. Depois sobe API e front.
- **Variáveis importantes:** `DATABASE_URL`, `DB_SCHEMA`, `JWT_ACCESS_SECRET`, `APP_URL` (base dos links de e-mail), `COOKIE_SECURE=false` (o link é `http`, sem TLS), `MAIL_API_KEY` (segredo, nunca no git), `API_PORT` (gravada no build).
- **Cenário do seed (`server/src/db/seed.ts`)**, senha de todos: `senha123`:
  - 3 equipes com 3 integrantes e 1 líder cada: **EstudaFácil** e **SaúdeConecta** (Etapa 1 aprovada, cursando a 2) e **FinPlan** (etapa 3, com **tarefa atrasada**).
  - 1 admin (`ana.souza@infohub.amf.br`) e 4 mentores; Carlos atende 2 equipes, Fernanda atende a terceira.
  - Alunos: `joao.alves@acad.amf.br` (líder EstudaFácil), `beatriz.fernandes@acad.amf.br` (líder SaúdeConecta); os outros 7 alunos estão em `server/src/db/seed.ts`.

---

## 8. Como foi testado (bom argumento na demo)

- **vitest** (92 testes): regras do funil (RN-01), jobs (RN-04), validação, assinatura de arquivo, tratamento de erro, fluxo de auth.
- **Teste de ponta a ponta na própria Coolify:** uma suíte de API (290 verificações) e uma de telas com Playwright (60), cobrindo papéis, escopo, funil, tarefas, upload, datas, e-mail, rate limit e navegação. Resultado final: **290/290 e 60/60**. Os testes acharam 17 problemas reais (ex.: erros 500 por dado inválido, prazo mostrando um dia antes, arquivos enviados dando 404 atrás do proxy, corrida na criação de versões) — todos corrigidos.

---

## 9. Perguntas prováveis (e a resposta curta)

**"Como o front fala com a API?"** Sempre por `/api/*`; o Next faz proxy para a API interna. Mesma origem, sem CORS.

**"Por que não usaram ORM?"** Instrução do professor; o SQL fica isolado nos `repository`, então trocar por Prisma depois só mexe neles.

**"Como você evita SQL injection?"** Toda query usa parâmetros posicionais (`$1…`), nunca concatenação; os dados também passam por validação zod antes.

**"Onde fica a senha? Como é protegida?"** Só o hash bcrypt em `users.password_hash`. Tokens de refresh e de reset ficam só como hash SHA-256.

**"O que acontece se roubarem o refresh token?"** Ele é rotacionado a cada uso; se o antigo reaparecer, detectamos o reuso e revogamos toda a cadeia.

**"Como garante que um aluno não veja a equipe de outro?"** Middleware de papel + checagem de escopo no service (RNF-03); fora do escopo devolve 403.

**"O que chama o quê ao avançar de etapa?"** `POST /teams/:id/stage` → `teams.controller.advanceStage` → `teams.service` valida com `journey.rules.assertTransitionAllowed` → em transação atualiza `teams`, fecha/abre `team_stage_history`, recalcula prontidão e grava auditoria.

**"Como as tarefas viram atrasadas?"** O scheduler (5 em 5 min) aplica a RN-04 e marca `LATE`; também dispara lembretes vencidos.

**"Como é o upload?"** `multer` grava em `server/uploads`, só PDF/PNG/JPEG/MP4 até 50 MB, com checagem da assinatura do arquivo; serve em `/uploads` pelo proxy. Vídeo de pitch é link externo.

**"E se a API cair?"** Front e API estão no mesmo container com `concurrently -k`: se um cai, o container reinicia.

**"O que falta / limitações?"** (seja honesto — pontua bem)
- Sem migrations incrementais (schema aplicado do zero).
- Uploads ficam no disco do container: precisa de volume persistente.
- Rate limit em memória (não compartilhado entre réplicas).
- E-mail em andamento se perde se o processo cair (tabela não guarda o corpo).
- O agendador roda no processo da API (candidato a worker separado).
- Ainda não há endpoints de exclusão (o schema já prevê soft delete).

---

## 10. Roteiro para estudar (1 hora)

1. **10 min** — leia as seções 1–2 e desenhe o diagrama de memória.
2. **15 min** — abra `server/src/app.ts` (como tudo é montado) e siga **um** endpoint completo: `tasks.routes.ts` → `tasks.controller.ts` → `tasks.service.ts` → `tasks.repository.ts`.
3. **10 min** — `auth.service.ts` (login, refresh, reuso) e `middleware/auth.ts`.
4. **10 min** — `journey.rules.ts`, `jobs/rules.ts` e `jobs/scheduler.ts` (as regras nomeadas).
5. **10 min** — `db/schema.sql` (só os `CREATE TABLE`) e `docs/modelagem-banco.md`.
6. **5 min** — faça a demo: entre como admin → funil → abrir FinPlan (tarefa atrasada) → entre como João → entregar um link → volte como mentora → avaliar → ver a auditoria.

Documentos complementares no repositório: `README.md` (setup e tabela de rotas), `decisoes.md` (decisões e trade-offs), `docs/Infohub_InovAMF_Requisitos.md` (RF/RN/RNF), `docs/modelagem-banco.md`.
