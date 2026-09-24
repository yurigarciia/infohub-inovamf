-- =====================================================================
-- InfoHub -> InovAMF — Banco de dados (PostgreSQL)
-- Modelagem ao vivo — cobre RF-01 a RF-24, aplica as decisões Q1-Q7
-- (ver decisoes.md) e as regras de negócio RN-01 a RN-04.
-- =====================================================================

-- Sem CREATE EXTENSION: gen_random_uuid() é nativo desde o PostgreSQL 13.
-- Este arquivo é aplicado no schema definido pelo search_path da conexão
-- (DB_SCHEMA — ver server/src/db/migrate.ts), então as tabelas abaixo não
-- levam prefixo de schema.

-- ---------------------------------------------------------------------
-- SOFT DELETE (exclusão lógica) — as entidades do "núcleo" operacional
-- que um admin/mentor exclui pela tela ganham a coluna `deleted_at`
-- (NULL = ativo). Nunca se roda DELETE nelas: marca-se `deleted_at` e
-- todas as leituras filtram `deleted_at IS NULL`. A exclusão de um
-- agregado (equipe, tarefa) marca os filhos na mesma transação.
--   COM soft delete: idea_areas, teams, team_members, team_mentors,
--     team_notes, task_templates, tasks, task_submissions, task_reminders.
--   SEM (hard delete / ciclo próprio): users (usa is_active),
--     student_profiles, journey_stages (fixas), team_stage_history e
--     audit_logs e email_notifications (logs, nunca somem),
--     refresh_tokens / password_reset_tokens (revoked_at / used_at).
-- Constraints UNIQUE viram índices únicos PARCIAIS (só entre linhas
-- ativas), pra um nome/vínculo poder ser reusado após a exclusão.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 1. USERS — administradores, mentores e alunos (líder ou integrante).
--    A distinção líder/integrante é POR EQUIPE (ver team_members),
--    não um atributo global do usuário (Q1). Atributos específicos de
--    aluno (course/period) NÃO ficam aqui — ver student_profiles
--    abaixo — pois não se aplicam a admin/mentor (evita colunas
--    sempre NULL para 2 dos 3 papéis).
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(200) NOT NULL,
    email               VARCHAR(255) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,
    phone               VARCHAR(20),
    role                VARCHAR(20) NOT NULL
                          CHECK (role IN ('ADMIN', 'MENTOR', 'STUDENT')),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    lgpd_consented_at   TIMESTAMPTZ,               -- RNF-02
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 1.1 STUDENT_PROFILES — extensão 1:1 de users, exclusiva para
--     role = 'STUDENT'. course/period são atributos da PESSOA (não da
--     participação numa equipe — por isso não ficam em team_members,
--     evitando duplicação quando o aluno integra várias equipes, Q4),
--     mas só existem para alunos — por isso não ficam em users.
-- ---------------------------------------------------------------------
CREATE TABLE student_profiles (
    user_id  UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    course   VARCHAR(150) NOT NULL,
    period   VARCHAR(20) NOT NULL
);

-- ---------------------------------------------------------------------
-- 2. IDEA_AREAS — lista configurável de área/setor (RF-04, campo do
--    formulário: "lista configurável pelo administrador").
-- ---------------------------------------------------------------------
CREATE TABLE idea_areas (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,   -- unicidade só entre ativas (índice parcial abaixo)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ              -- soft delete (NULL = ativa)
);

-- ---------------------------------------------------------------------
-- 3. JOURNEY_STAGES — as 6 etapas fixas do funil (lookup table).
-- ---------------------------------------------------------------------
CREATE TABLE journey_stages (
    id      SERIAL PRIMARY KEY,
    number  SMALLINT NOT NULL UNIQUE CHECK (number BETWEEN 1 AND 6),
    name    VARCHAR(120) NOT NULL
);

-- ---------------------------------------------------------------------
-- 4. TEAMS — a equipe/ideia em avaliação no InfoHub.
--    cohort = turma/semestre, para RF-24 (filtro por período).
-- ---------------------------------------------------------------------
CREATE TABLE teams (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_name               VARCHAR(200) NOT NULL,
    idea_description        TEXT NOT NULL,
    area_id                 INT REFERENCES idea_areas(id),
    idea_maturity           VARCHAR(30) NOT NULL
                              CHECK (idea_maturity IN
                                ('IDEA', 'PROTOTYPE', 'MVP_IN_PROGRESS', 'MVP_READY')),
    source_origin           VARCHAR(150),           -- "como conheceu o InfoHub"
    cohort                  VARCHAR(20) NOT NULL,   -- turma/semestre, ex: "2026.2"
    current_stage_id        INT NOT NULL REFERENCES journey_stages(id),
    is_ready_for_inovamf    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at              TIMESTAMPTZ            -- soft delete (NULL = ativa)
);

-- ---------------------------------------------------------------------
-- 5. TEAM_MEMBERS — relação N:N entre users e teams.
--    member_role define líder x integrante DENTRO da equipe (Q1).
--    Um aluno pode estar em múltiplas equipes ativas (Q4) — por isso
--    NÃO há UNIQUE(user_id) global, apenas UNIQUE(team_id, user_id).
-- ---------------------------------------------------------------------
CREATE TABLE team_members (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id),
    member_role  VARCHAR(10) NOT NULL CHECK (member_role IN ('LEADER', 'MEMBER')),
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ            -- soft delete (cascata da equipe / remoção do integrante)
    -- UNIQUE(team_id, user_id) só entre ativos — ver índice parcial abaixo
);

-- ---------------------------------------------------------------------
-- 6. TEAM_MENTORS — relação N:N entre mentores (users.role = MENTOR)
--    e teams. Mentor só enxerga o que estiver aqui (Q2, RNF-03).
-- ---------------------------------------------------------------------
CREATE TABLE team_mentors (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    mentor_id    UUID NOT NULL REFERENCES users(id),
    assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ            -- soft delete (cascata da equipe / desatribuição do mentor)
    -- UNIQUE(team_id, mentor_id) só entre ativos — ver índice parcial abaixo
);

-- ---------------------------------------------------------------------
-- 7. TEAM_STAGE_HISTORY — histórico de transições entre etapas
--    (RF-08, RF-09). changed_by NULL = transição automática do sistema.
-- ---------------------------------------------------------------------
CREATE TABLE team_stage_history (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    stage_id     INT NOT NULL REFERENCES journey_stages(id),
    entered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    exited_at    TIMESTAMPTZ,
    changed_by   UUID REFERENCES users(id)
);

-- ---------------------------------------------------------------------
-- 8. TEAM_NOTES — anotações internas do mentor/admin (RF-10),
--    não visíveis ao aluno.
-- ---------------------------------------------------------------------
CREATE TABLE team_notes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL REFERENCES users(id),
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ            -- soft delete (NULL = ativa)
);

-- ---------------------------------------------------------------------
-- 9. TASK_TEMPLATES — modelos de tarefa pré-configurados por etapa
--    (RF-11), ex.: "enviar Business Model Canvas" na Etapa 5.
-- ---------------------------------------------------------------------
CREATE TABLE task_templates (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id     INT NOT NULL REFERENCES journey_stages(id),
    title        VARCHAR(200) NOT NULL,
    description  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ            -- soft delete (NULL = ativo)
);

-- ---------------------------------------------------------------------
-- 10. TASKS — tarefas atribuídas a uma equipe (RF-11 a RF-13, RN-04).
-- ---------------------------------------------------------------------
CREATE TABLE tasks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    stage_id     INT NOT NULL REFERENCES journey_stages(id),
    template_id  UUID REFERENCES task_templates(id),
    title        VARCHAR(200) NOT NULL,
    description  TEXT,
    due_date     DATE NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN
                    ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'LATE', 'APPROVED', 'REJECTED')),
    created_by   UUID NOT NULL REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ            -- soft delete (NULL = ativa; cascata da equipe)
);

-- ---------------------------------------------------------------------
-- 11. TASK_SUBMISSIONS — entregas de uma tarefa, com histórico de
--     versões (RF-14, RF-15, RF-16). is_external_link cobre o caso do
--     Pitch Vídeo, que é sempre link (Q3), e não upload de arquivo.
-- ---------------------------------------------------------------------
CREATE TABLE task_submissions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id            UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    submitted_by       UUID NOT NULL REFERENCES users(id),
    file_url           TEXT NOT NULL,               -- URL no blob storage OU link externo
    is_external_link   BOOLEAN NOT NULL DEFAULT FALSE,
    version            INT NOT NULL DEFAULT 1,
    is_current         BOOLEAN NOT NULL DEFAULT TRUE,
    submitted_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    review_status      VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CHECK (review_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    review_comment     TEXT,
    reviewed_by        UUID REFERENCES users(id),
    reviewed_at        TIMESTAMPTZ,
    deleted_at         TIMESTAMPTZ       -- soft delete (NULL = ativa; cascata da tarefa/equipe)
);

-- ---------------------------------------------------------------------
-- 12. TASK_REMINDERS — datas de lembrete configuradas por tarefa
--     (RF-17, RF-18, RF-20 quando criado avulso/manual).
-- ---------------------------------------------------------------------
CREATE TABLE task_reminders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    remind_at   TIMESTAMPTZ NOT NULL,
    is_manual   BOOLEAN NOT NULL DEFAULT FALSE,      -- RF-20: lembrete manual avulso
    sent        BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ                          -- soft delete (NULL = ativo; cascata da tarefa/equipe)
);

-- ---------------------------------------------------------------------
-- 13. EMAIL_NOTIFICATIONS — log de e-mails disparados via Resend (Q7),
--     para RF-18, RF-19 e rastreabilidade (RNF-05, RNF-06).
-- ---------------------------------------------------------------------
CREATE TABLE email_notifications (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id    UUID NOT NULL REFERENCES users(id),
    type                 VARCHAR(50) NOT NULL
                          CHECK (type IN (
                            'TASK_ASSIGNED', 'DEADLINE_REMINDER', 'DEADLINE_LATE',
                            'SUBMISSION_APPROVED', 'SUBMISSION_REJECTED',
                            'NEW_TEAM_REGISTERED', 'FILE_SUBMITTED', 'TASK_LATE',
                            'MANUAL_REMINDER'
                          )),
    subject              VARCHAR(255) NOT NULL,
    related_team_id      UUID REFERENCES teams(id),
    related_task_id      UUID REFERENCES tasks(id),
    status               VARCHAR(20) NOT NULL DEFAULT 'SENT'
                          CHECK (status IN ('SENT', 'FAILED', 'RETRIED')),
    provider_message_id  VARCHAR(255),               -- id retornado pelo Resend
    sent_at              TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 14. AUDIT_LOGS — trilha de auditoria (RNF-05): mudanças de etapa,
--     aprovações/reprovações e envios de e-mail.
-- ---------------------------------------------------------------------
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id   UUID REFERENCES users(id),        -- NULL = ação automática do sistema
    entity_type     VARCHAR(50) NOT NULL,              -- ex.: 'team', 'task', 'task_submission'
    entity_id       UUID NOT NULL,
    action          VARCHAR(50) NOT NULL,              -- ex.: 'STAGE_ADVANCED', 'TASK_APPROVED'
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 15. REFRESH_TOKENS — controle de sessão (RF-01). O access token em
--     si é um JWT assinado de vida curta e NÃO é persistido (validado
--     só por assinatura + expiração, como token stateless de verdade);
--     o refresh token É persistido porque precisa ser revogável (logout,
--     troca de senha, "sair de todos os dispositivos") e é rotacionado
--     a cada uso (token_hash antigo marcado revoked_at, replaced_by_id
--     aponta pro novo — detecta reuso de token roubado/vazado). Guarda
--     o HASH do token (SHA-256), nunca o valor bruto — igual a senha,
--     um vazamento da tabela não deve entregar sessões utilizáveis.
-- ---------------------------------------------------------------------
CREATE TABLE refresh_tokens (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash       VARCHAR(255) NOT NULL UNIQUE,
    issued_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at       TIMESTAMPTZ NOT NULL,
    revoked_at       TIMESTAMPTZ,                      -- NULL = ainda válido
    replaced_by_id   UUID REFERENCES refresh_tokens(id),  -- cadeia de rotação
    user_agent       VARCHAR(255),                      -- contexto do dispositivo/sessão
    ip_address       INET,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 16. PASSWORD_RESET_TOKENS — "recuperação de senha" do RF-01. Mesmo
--     raciocínio de guardar só o hash do refresh_tokens; used_at marca
--     o token como consumido (uso único) sem precisar apagar a linha,
--     preservando o registro pra auditoria/rate-limiting de pedidos.
-- ---------------------------------------------------------------------
CREATE TABLE password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,                  -- janela curta, ex.: 1h
    used_at     TIMESTAMPTZ,                            -- NULL = ainda não usado
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- ÍNDICES — cobrindo foreign keys e padrões de consulta do painel
-- do administrador (RF-06, RF-07).
-- =====================================================================
CREATE INDEX idx_teams_current_stage        ON teams (current_stage_id);
CREATE INDEX idx_teams_area                 ON teams (area_id);
CREATE INDEX idx_teams_cohort               ON teams (cohort);
CREATE INDEX idx_teams_active               ON teams (created_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_team_members_user          ON team_members (user_id);
CREATE INDEX idx_team_members_team          ON team_members (team_id);

CREATE INDEX idx_team_mentors_mentor        ON team_mentors (mentor_id);

CREATE INDEX idx_team_stage_history_team    ON team_stage_history (team_id);

CREATE INDEX idx_team_notes_team            ON team_notes (team_id);

CREATE INDEX idx_tasks_team                 ON tasks (team_id);
CREATE INDEX idx_tasks_status               ON tasks (status);
CREATE INDEX idx_tasks_due_date             ON tasks (due_date);
CREATE INDEX idx_tasks_open_overdue         ON tasks (due_date)
    WHERE deleted_at IS NULL AND status IN ('PENDING', 'IN_PROGRESS');  -- RN-04

CREATE INDEX idx_task_submissions_task      ON task_submissions (task_id);
CREATE INDEX idx_task_submissions_current   ON task_submissions (task_id) WHERE is_current AND deleted_at IS NULL;

CREATE INDEX idx_task_reminders_pending     ON task_reminders (remind_at) WHERE NOT sent AND deleted_at IS NULL;

-- Unicidade só entre linhas ativas (soft delete) — libera reuso de
-- nome/vínculo depois da exclusão.
CREATE UNIQUE INDEX ux_idea_areas_name_active     ON idea_areas   (name)              WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ux_team_members_active        ON team_members (team_id, user_id)  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ux_team_mentors_active        ON team_mentors (team_id, mentor_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_email_notifications_user   ON email_notifications (recipient_user_id);

CREATE INDEX idx_audit_logs_entity          ON audit_logs (entity_type, entity_id);

CREATE INDEX idx_refresh_tokens_user        ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_active      ON refresh_tokens (user_id) WHERE revoked_at IS NULL;

CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens (user_id);

-- =====================================================================
-- SEED — dados de referência mínimos (etapas do funil).
-- =====================================================================
INSERT INTO journey_stages (number, name) VALUES
    (1, 'Envio da ideia'),
    (2, 'Contato com a equipe'),
    (3, 'Encontro 1 - Entendendo a ideia'),
    (4, 'Encontro 2 - Proposta de valor'),
    (5, 'Encontro 3 - Modelo de negocio'),
    (6, 'Encontro 4 - Pitch e inscricao');
