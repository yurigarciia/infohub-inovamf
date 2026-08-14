-- =====================================================================
-- InfoHub -> InovAMF — Banco de dados (PostgreSQL)
-- Modelagem ao vivo — cobre RF-01 a RF-24, aplica as decisões Q1-Q7
-- (ver decisoes.md) e as regras de negócio RN-01 a RN-04.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1. USERS — administradores, mentores e alunos (líder ou integrante).
--    A distinção líder/integrante é POR EQUIPE (ver team_members),
--    não um atributo global do usuário (Q1).
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
-- 2. IDEA_AREAS — lista configurável de área/setor (RF-04, campo do
--    formulário: "lista configurável pelo administrador").
-- ---------------------------------------------------------------------
CREATE TABLE idea_areas (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
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
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
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
    course       VARCHAR(150),
    period       VARCHAR(20),
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (team_id, user_id)
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
    UNIQUE (team_id, mentor_id)
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
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
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
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
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
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
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
    reviewed_at        TIMESTAMPTZ
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
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
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

-- =====================================================================
-- ÍNDICES — cobrindo foreign keys e padrões de consulta do painel
-- do administrador (RF-06, RF-07).
-- =====================================================================
CREATE INDEX idx_teams_current_stage        ON teams (current_stage_id);
CREATE INDEX idx_teams_area                 ON teams (area_id);
CREATE INDEX idx_teams_cohort               ON teams (cohort);

CREATE INDEX idx_team_members_user          ON team_members (user_id);
CREATE INDEX idx_team_members_team          ON team_members (team_id);

CREATE INDEX idx_team_mentors_mentor        ON team_mentors (mentor_id);

CREATE INDEX idx_team_stage_history_team    ON team_stage_history (team_id);

CREATE INDEX idx_team_notes_team            ON team_notes (team_id);

CREATE INDEX idx_tasks_team                 ON tasks (team_id);
CREATE INDEX idx_tasks_status               ON tasks (status);
CREATE INDEX idx_tasks_due_date             ON tasks (due_date);

CREATE INDEX idx_task_submissions_task      ON task_submissions (task_id);
CREATE INDEX idx_task_submissions_current   ON task_submissions (task_id) WHERE is_current;

CREATE INDEX idx_task_reminders_pending     ON task_reminders (remind_at) WHERE NOT sent;

CREATE INDEX idx_email_notifications_user   ON email_notifications (recipient_user_id);

CREATE INDEX idx_audit_logs_entity          ON audit_logs (entity_type, entity_id);

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
