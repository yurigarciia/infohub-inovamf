# Modelagem do Banco de Dados — InfoHub → InovAMF

Registro da atividade de modelagem ao vivo (ver `decisoes.md`). Artefatos gerados:

- [`db/schema.sql`](../db/schema.sql) — DDL completo em PostgreSQL (entrega do dia).
- [`app/prisma/schema.prisma`](../app/prisma/schema.prisma) — ORM definido (Prisma), espelhando o `.sql`.
- [`db/diagram.dbml`](../db/diagram.dbml) — DER pronto para importar em [dbdiagram.io](https://dbdiagram.io) (Import → DBML).

## 1. Tabelas para suprir RF-01 a RF-24

| Tabela | Cobre |
|---|---|
| `users` | RF-01, RF-02, RF-03 (login, cadastro, gestão de contas) |
| `student_profiles` | RF-04 (curso/período do aluno), exclusiva de `role = STUDENT` |
| `idea_areas` | RF-04 (lista de área/setor configurável) |
| `journey_stages` | as 6 etapas fixas do funil (Seção 3 do documento de requisitos) |
| `teams` | RF-04, RF-05 (cadastro da ideia/equipe), RF-06, RF-24 (`cohort`) |
| `team_members` | RF-04 (vínculo aluno↔equipe), Q1 (líder x integrante) |
| `team_mentors` | Q2 (mentor restrito às suas equipes), RNF-03 |
| `team_stage_history` | RF-08, RF-09 (histórico e avanço/retrocesso de etapa) |
| `team_notes` | RF-10 (anotações internas do mentor) |
| `task_templates` | RF-11 (modelos de tarefa por etapa) |
| `tasks` | RF-11, RF-12, RF-13, RN-04 |
| `task_submissions` | RF-14, RF-15, RF-16 (entrega, aprovação, versionamento) |
| `task_reminders` | RF-17, RF-18 (parte de prazo), RF-20 (lembrete manual) |
| `email_notifications` | RF-18, RF-19 (log de e-mails via Resend) |
| `audit_logs` | RNF-05 (auditoria) |
| `refresh_tokens` | RF-01 (controle de sessão — login persiste entre acessos, logout revoga) |
| `password_reset_tokens` | RF-01 (recuperação de senha) |

RF-22 (dashboard) e RF-23 (export CSV) são resolvidos por consulta sobre as tabelas acima — não exigem tabela própria.

**Ajuste de normalização:** `course`/`period` (curso e semestre/período do aluno) não ficam em `team_members`, nem em `users`.

- Não em `team_members`: são atributos da **pessoa**, não da participação numa equipe específica. Mantê-los ali duplicaria o dado a cada equipe que o aluno integrasse (Q4) e exigiria editar em N lugares a cada mudança de curso/período — violação de 3FN.
- Não em `users`: `admin` e `mentor` também são `users`, e não têm curso/período — colocar ali criaria colunas sempre `NULL` para 2 dos 3 papéis (um cheiro clássico de "atributo de subtipo numa tabela genérica").
- Solução: `student_profiles`, tabela em relação **1:1** com `users` (chave primária = chave estrangeira, `user_id`), existindo apenas para linhas com `role = 'STUDENT'`. Segue o padrão de "tabela por subtipo" (table-per-subtype).

**Controle de tokens (RF-01 — login/recuperação de senha):** duas tabelas, não três.

- **Access token não tem tabela.** É um JWT assinado de vida curta (ex.: 15 min), validado só por assinatura + expiração — stateless por definição. Persistir o access token no banco eliminaria a vantagem de ser stateless (uma consulta ao banco a cada requisição autenticada, justamente o que o JWT existe pra evitar) sem ganhar nada em troca, já que a expiração curta já limita o estrago de um token roubado.
- **`refresh_tokens`** existe porque, ao contrário do access token, ele *precisa* ser revogável (logout, "sair de todos os dispositivos", troca de senha) — e revogação exige estado em algum lugar. Rotacionado a cada uso: o token antigo recebe `revoked_at` e `replaced_by_id` aponta pro novo, formando uma cadeia — se um token já revogado for reapresentado, é sinal de reuso (roubo), e dá pra invalidar a cadeia inteira a partir dali.
- **`password_reset_tokens`** é a tabela por trás do "recuperação de senha" citado no RF-01: token de uso único (`used_at`), janela de validade curta.
- **As duas guardam `token_hash`, nunca o token em texto puro** — mesmo raciocínio de `users.password_hash`: um vazamento da tabela não deve entregar tokens utilizáveis. O valor bruto só existe em trânsito (URL de reset, cookie do refresh token).

## 2. Atributos e chave primária

Todas as tabelas de entidade de negócio usam `UUID` como chave primária (`gen_random_uuid()`), exceto as duas tabelas de referência estática (`idea_areas`, `journey_stages`), que usam `SERIAL`, por serem pequenas listas de apoio (lookup), sem necessidade de UUID. Ver `db/schema.sql` para a lista completa de colunas, tipos e `CHECK` constraints (ex.: `role`, `status`, `review_status` como enums via `CHECK`).

## 3. Relacionamentos

- **1:1**: `users ↔ student_profiles` (só existe quando `role = 'STUDENT'`).
- **1:N**: `idea_areas → teams`, `journey_stages → teams/tasks/task_templates/team_stage_history`, `teams → tasks/team_notes/team_stage_history`, `tasks → task_submissions/task_reminders`, `users → team_notes/audit_logs/email_notifications/refresh_tokens/password_reset_tokens` (como autor/ator/destinatário/titular).
- **1:N recursivo (auto-relacionamento)**: `refresh_tokens → refresh_tokens` via `replaced_by_id`, formando a cadeia de rotação de um token pro seu sucessor.
- **N:N** (via tabela associativa): `users ↔ teams` através de `team_members` (um aluno pode ter contas em múltiplas equipes — Q4) e `users ↔ teams` através de `team_mentors` (um mentor pode atender várias equipes, uma equipe pode ter mais de um mentor).

## 4. Decisões em aberto (Q1–Q7) aplicadas ao modelo

| Pergunta | Decisão (`decisoes.md`) | Onde aparece no modelo |
|---|---|---|
| Q1 — login de integrante | Integrante tem login próprio, diferente do líder | `team_members.member_role` (`LEADER`/`MEMBER`) distingue o acesso dentro da equipe — não é um atributo global em `users`, pois a mesma pessoa pode ser líder em uma equipe e integrante em outra |
| Q2 — perfil de mentor | Perfil próprio, restrito às equipes | `users.role = 'MENTOR'` + tabela `team_mentors` (N:N) escopando o acesso |
| Q3 — Pitch Vídeo | Link externo, não upload | `task_submissions.is_external_link` + `file_url` aceitando link (YouTube/Drive) |
| Q4 — múltiplas equipes por aluno | Permitido | `team_members` é N:N sem `UNIQUE(user_id)` global — só unicidade de `(team_id, user_id)` (índice parcial entre ativos, ver Seção 5) |
| Q5 — máximo de integrantes | Sem limite | Nenhuma constraint de contagem em `team_members` |
| Q6 — etapa pós-InovAMF | Não existe | `teams.is_ready_for_inovamf` é o status final; não há etapa 7 em `journey_stages` |
| Q7 — serviço de e-mail | Resend | `email_notifications.provider_message_id` guarda o id retornado pelo Resend |

**Fluxo de cadastro por e-mail (formulário inicial, T005):** o formulário da Etapa 1 pede o e-mail de cada integrante, não só nome/curso. Para cada e-mail informado (líder e colegas), o backend faz *lookup* em `users.email` (`UNIQUE`): se já existe conta, apenas cria o vínculo em `team_members`; se não existe, cria o `User` (+ `student_profiles`). Isso evita contas duplicadas quando o mesmo aluno é convidado por equipes diferentes (Q4) e é o motivo de `users.email` ser `UNIQUE` no schema.

## 5. Soft delete (exclusão lógica)

Requisito posterior: nenhuma exclusão física no núcleo operacional. As tabelas
que um admin/mentor "exclui" pela tela ganham `deleted_at TIMESTAMPTZ` (NULL =
ativo); nunca se roda `DELETE`, marca-se `deleted_at` e **toda leitura filtra
`deleted_at IS NULL`**.

| Com soft delete | Sem (motivo) |
|---|---|
| `idea_areas`, `teams`, `team_members`, `team_mentors`, `team_notes`, `task_templates`, `tasks`, `task_submissions`, `task_reminders` | `users` (usa `is_active`), `student_profiles`, `journey_stages` (fixas), `team_stage_history` (histórico), `audit_logs` / `email_notifications` (logs, nunca somem), `refresh_tokens` / `password_reset_tokens` (já têm `revoked_at` / `used_at`) |

**Constraints `UNIQUE` → índices únicos parciais.** Para um nome/vínculo poder ser
reusado depois da exclusão, a unicidade passa a valer só entre linhas ativas:

- `ux_idea_areas_name_active` — `idea_areas(name) WHERE deleted_at IS NULL`
- `ux_team_members_active` — `team_members(team_id, user_id) WHERE deleted_at IS NULL`
- `ux_team_mentors_active` — `team_mentors(team_id, mentor_id) WHERE deleted_at IS NULL`

**Cascata.** Excluir um agregado marca os filhos na mesma transação:
`teams` → `team_members`, `team_mentors`, `team_notes`, `tasks` → (`task_submissions`,
`task_reminders`). `tasks` → `task_submissions`, `task_reminders`. `team_stage_history`
não é marcado (é registro histórico). No código: `softDeleteTeamCascade` /
`softDeleteTaskCascade` (repositórios do `server/`).

## 6. DER no dbdiagram.io

Importar `db/diagram.dbml` em https://dbdiagram.io via **Import → DBML** para projetar o diagrama no telão.
