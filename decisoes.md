Antes de codar, cada dupla registra sua escolha de Banco de dados e ORM (usar nenhum também é uma decisão de arquitetura):

01 - Querem usar ORM? Sim ou não?
02 - Qual? Sequelize, Prisma, TypeORM, MikroORM, Objection, Knex...
03 - Por quê? Produtividade, migrations, tipagem, documentação, curva de aprendiado.
04 - Qual trade-off vocês assumem? Toda escolha sacrifica algo, digam o quê.

## Respostas — InfoHub → InovAMF

**01 — Querem usar ORM?**
Sim.

**02 — Qual?**
Prisma. (Decisão revisada: a escolha inicial havia sido TypeORM, substituída por Prisma devido ao baixo nível de familiaridade da turma com ORMs — ver trade-offs abaixo.)

**03 — Por quê?**
- Curva de aprendizado mais suave para quem está tendo o primeiro contato com ORM: schema declarativo único (`schema.prisma`), sem decorators nem configuração de metadata reflection.
- Tipagem gerada automaticamente a partir do schema (Prisma Client), reduzindo erros só percebidos em runtime — importante para uma turma com baixa familiaridade.
- Documentação e mensagens de erro consideradas as mais didáticas entre os ORMs de Node/TypeScript, o que pesa em contexto acadêmico.
- Migrations declarativas e simples de gerar (`prisma migrate dev`), com boa integração com Postgres e com Next.js.

**04 — Qual trade-off vocês assumem?**
- Menos flexível que TypeORM para modelagem orientada a objetos (sem Active Record, sem herança de entities) — o schema é centralizado em um único arquivo, o que pode ficar extenso conforme o domínio cresce.
- Prisma Client é gerado em build step (`prisma generate`), adicionando uma etapa a mais no fluxo de desenvolvimento/CI que precisa ser lembrada.
- Menor controle fino sobre queries complexas comparado a um query builder puro (ex.: Knex) ou SQL puro — para casos muito específicos pode ser necessário cair para `$queryRaw`.
- Trocar a decisão após o planejamento inicial (de TypeORM para Prisma) tem custo de retrabalho nos tickets já descritos em `PLAN.md`, aceito aqui porque o projeto ainda não tinha código implementado.

---


Mais perguntas em aberto:
Seção 8 do documento de requisitos: o que precisa ser decidido antes de desenhar o banco:
Q1 - Cada integrante de equipe terá login próprio, ou só o aluno líder acessa o sistema?
R: Líder e integrante com acessos diferentes

Q2 - Mentores terão perfil próprio (restrito às suas equipes) ou usarão o login de administrador?
R: Perfil próprio

Q3 - O Pitch Vídeo será upload de arquivo ou link (Youtube/Drive)? Muda o armazenamento.
R: Link 

Q4 - Um aluno pode participar de mais de uma ideia/equipe ao mesmo tempo?
R: Pode participar de mais.

Q5 - Existe um numero máximo de integrantes por equipe?
R: Não.

Q6 - Haverá etapas pós-InovAMF, ou o escopo termina na entrega dos materiais?
R: Não.

Q7 - Qual serviço de e-mail a instituição usa ou prefee (Google Workspace, Outlook, transacional)?
R: RESEND

_Demais decisões de arquitetura da disciplina serão registradas neste arquivo à medida que forem tomadas (ver `PLAN.md`, Seção 8 — Open Questions, para pontos ainda pendentes de padronização com a turma)._

------

Modelagem ao Vivo

1 - Definir tabelas para suprir RF-01 a RF-24
2 - Deinifir os atributos e a chave primária de cada tabela.
3 - Ligar os relacionamentos (1:N, N:N)
4 - Aplicar as decisões em aberto (Q1 - Q7) no modelo.
5 - Montar o DER no dbdiagram.io, projetado no telão

* Leve em consideração todas as decisões tomadas até o momento

**Resultado:** modelagem concluída — ver [`docs/modelagem-banco.md`](docs/modelagem-banco.md) (raciocínio dos 5 passos), [`db/schema.sql`](db/schema.sql) (DDL completo) e [`db/diagram.dbml`](db/diagram.dbml) (importar em dbdiagram.io).

Requisitos Iniciais do Projeto

As regras do jogo:
1 - Front + Back em um único projeto: toda a aplicação deve subir com um único comando (sem backend e frontend separado)
2 - ENTREGA DE HOJE: arquivo .sql com o banco de dados completo  + o ORM definido

**Entregue:** [`db/schema.sql`](db/schema.sql) (DDL completo) + [`app/prisma/schema.prisma`](app/prisma/schema.prisma) (ORM: Prisma). *(schema.prisma movido para dentro de `app/` quando o projeto Next.js foi organizado nessa pasta — ver decisão abaixo.)*

------

Frontend com dados mockados

Próximo entregável: interface completa (sem fluxos cadastrais/listagem com dados reais), consumindo dados mockados por uma camada de services já no formato esperado do backend futuro.

**Decisão — stack de UI:** Tailwind CSS + shadcn/ui. Motivo: componentes acessíveis prontos (dialog, tabs, table, form) aceleram montar todas as telas do funil sem abrir mão de qualidade visual; customizados com a paleta de cores do InfoHub (vermelho-bordô → laranja, extraída de `assets/logotipo.png`). Trade-off: componentes shadcn são copiados para dentro do repo (não é uma dependência fechada), então ficam livres para editar, mas aumentam a quantidade de arquivos em `src/components/ui`.

**Entregue:** [`docs/frontend-plan.md`](docs/frontend-plan.md) — design system (paleta de cores, tipografia), escopo de telas mapeado às RF-01 a RF-24, arquitetura da camada de mocks/services (pensada para integração futura com o backend real) e backlog de 17 tickets (T-FE-01 a T-FE-17).

**Decisão — reorganização de pastas:** ao montar o setup (T-FE-01), a aplicação Next.js inteira (package.json, src/, prisma/) foi movida para `app/` na raiz do repositório, em vez de ficar solta junto com `docs/`, `db/`, `decisoes.md` etc. Motivo: a raiz estava acumulando arquivos de natureza muito diferente (documentação acadêmica vs. código da aplicação) e ficaria pior conforme o projeto crescesse. A raiz ganhou um `package.json` mínimo que delega `npm run dev/build/lint` para dentro de `app/`, preservando a regra da disciplina de subir com um comando só a partir da raiz, sem back/front separados. Trade-off: um nível extra de indireção (a raiz não é mais o próprio projeto Next.js) — aceitável porque documentação e código continuam claramente separados.

------

## Fase 2 — Backend (revisão da decisão de ORM)

Instrução do professor (Augusto Gehrke, 09/09): "Node, TypeScript e PostgreSQL. **Deixamos o ORM Prisma para quando formos reestruturar o projeto.**" Ou seja, a Fase 2 é implementada **sem ORM**.

**01 — Usar ORM nesta fase?**
Não. O Prisma continua planejado, mas só para a fase futura de reestruturação.

**02 — O que usamos no lugar?**
`pg` (node-postgres) + **SQL escrito à mão** em arquivos de repositório (`server/src/modules/<ctx>/*.repository.ts`). Sem query builder (Knex etc.) também — parâmetros posicionais (`$1, $2`) sempre, mapeamento `snake_case → camelCase` no `SELECT ... AS`.

**03 — Por quê?**
- É a instrução explícita do professor: o objetivo pedagógico da fase é escrever e enxergar o SQL, não abstraí-lo.
- Dependência mínima e sem build step (`prisma generate`): o backend é só `tsx`/`tsc`.
- Controle total sobre as queries agregadas do dashboard (`COUNT(*) FILTER`, `GROUP BY`) e sobre transações (rotação de refresh token, versionamento de entregas).
- A camada `repository` isola 100% do SQL — quando o Prisma entrar, só esses arquivos mudam; `service`/`controller`/`routes` ficam intactos.

**04 — Trade-off assumido**
- Sem tipagem gerada do schema: os tipos das linhas (`*Row`) são escritos e mantidos à mão, e um `SELECT` divergente do tipo só quebra em runtime.
- Sem migrations versionadas: o schema é aplicado por `server/src/db/migrate.ts` rodando `db/schema.sql` inteiro num banco limpo (`--reset`). Serve para desenvolvimento/demo, não para evolução incremental de um banco em produção.
- Mais código repetitivo (todo `SELECT` lista colunas e faz o alias) e mais superfície para SQL injection se alguém interpolar valor em string — mitigado pela convenção "sempre `$n`" e pelos helpers em `shared/sql.ts`.
- Boilerplate de mapear datas: o `pg` devolve `TIMESTAMPTZ`/`DATE` como string; a conversão para `Date` é feita na fronteira do frontend (`app/src/services/*`).

**Arquitetura do `server/`:** servidor Express separado em `server/`, subindo junto com o front por um script `concurrently` na raiz (`npm run dev`) — mantém a regra "sobe com um comando só" sem fundir os dois processos. O PostgreSQL é **externo**: a conexão vem só de `DATABASE_URL` (instalação local, container próprio ou serviço gerenciado); o repositório não empacota mais um `docker-compose.yml` — `db:migrate`/`db:reset` aplicam `db/schema.sql` em qualquer banco apontado pela env. Camadas por módulo: `routes → controller (zod) → service (regra de negócio, transações, auditoria, notificações) → repository (SQL puro)`.

**Auth:** senha com `bcryptjs`; **access token** = JWT curto (~15 min), stateless, **não persistido**; **refresh token** = opaco (32 bytes), hash SHA-256 em `refresh_tokens`, rotacionado a cada uso (`revoked_at` + `replaced_by_id`), com detecção de reuso que derruba a cadeia toda; entregue em cookie `httpOnly` path `/auth`. Recuperação de senha em `password_reset_tokens` (uso único, 1h).

**Jobs agendados** (RN-04, RF-17 automático): `setInterval` no próprio processo da API (`server/src/jobs/`), isolado de propósito — candidato a worker separado na reestruturação.

**Deploy single-service:** requisito do ambiente (Coolify) — front e API no **mesmo recurso**, só a porta do front exposta. O Next reescreve `/api/*` para a API interna (`app/next.config.ts` → `http://127.0.0.1:${API_PORT}`), então as chamadas do browser são same-origin: sem CORS, cookie de refresh com `path=/`. `entrypoint.sh` roda o bootstrap do banco e sobe os dois processos com `concurrently -k`. A porta interna da API é `API_PORT` (não `PORT`, que fica com o Next). Trade-off: um processo derruba o outro (`-k`) e o container reinicia — aceitável para o porte do projeto; a separação real volta na fase de reestruturação.

**Banco compartilhado (schema por dupla):** o Postgres da disciplina é um só, com um schema por dupla e outras pessoas no `public`. O app fixa o `search_path` do pool em `DB_SCHEMA` (e só nele, sem `public`), de modo que o SQL segue sem prefixo e um schema inexistente falha em vez de vazar pro `public`. `db:reset`/`db:seed` são destrutivos, então recusam o `public` e qualquer schema que não seja vazio ou deste app (`server/src/db/schema-guard.ts`). O `CREATE EXTENSION pgcrypto` saiu do `schema.sql` (`gen_random_uuid()` é nativo no PG ≥ 13) para não instalar extensão num banco alheio. O bootstrap garante dados essenciais (áreas, modelos de tarefa) e o 1º admin por env (`server/src/db/essentials.ts`), pois o `schema.sql` só carrega as etapas.


**E-mail (revisão da Q7):** em vez do Resend, usamos o **mail-service** próprio da dupla (`POST /emails` com `x-api-key`, corpo em HTML, resposta `202 queued` — fire-and-forget, ele mesmo refaz até 3x). Fica atrás da interface `EmailSender` (`server/src/modules/notifications/email-senders.ts`); sem `MAIL_API_KEY` cai no `ConsoleEmailSender`. Decisões:
- **Cold start.** O mail-service roda num host que hiberna (dezenas de segundos para acordar). Por isso o envio é **em segundo plano**: `recordNotification` devolve na hora e a entrega corre depois, com timeout de 45 s por tentativa e **4 tentativas** (esperas de 4 s, 15 s e 45 s) para falhas de rede/timeout/5xx/408/429. Erros 400/401/403 não são repetidos. Assim o cold start só **atrasa** o e-mail em vez de perdê-lo, e a request do usuário (cadastro, criar tarefa…) não espera o mail-service.
- **Registro.** A linha em `email_notifications` (+ auditoria) é gravada quando a entrega termina: `SENT` = "aceito e enfileirado" pelo mail-service (ele não expõe status de entrega), `FAILED` = tentativas esgotadas. O shutdown espera até 10 s pelos envios pendentes. Trade-off: um envio em andamento se perde se o processo cair (a tabela não guarda o corpo, então não dá para retomar do banco).
- **Contas de demo.** Os e-mails do seed são fictícios, em domínios que podem existir; `MAIL_SKIP_DOMAINS` impede o envio real a eles (só log, `provider_message_id = demo-skip-…`).
- **Segredo.** A chave é segredo de deploy (env do Coolify), nunca versionada.
