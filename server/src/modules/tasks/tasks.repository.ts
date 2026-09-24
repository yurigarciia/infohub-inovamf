import type { PoolClient } from "pg";
import { maybeOne, query, tx } from "../../shared/sql.js";

/**
 * SQL puro do módulo de tarefas (B4). Datas saem como ISO string; o
 * front converte para Date na fronteira.
 */

export interface UserLite {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "ADMIN" | "MENTOR" | "STUDENT";
  isActive: boolean;
  lgpdConsentedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskTemplateRow {
  id: string;
  stageId: number;
  title: string;
  description: string | null;
  createdAt: string;
}

export interface TaskRow {
  id: string;
  teamId: string;
  stageId: number;
  templateId: string | null;
  title: string;
  description: string | null;
  dueDate: string;
  status: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionRow {
  id: string;
  taskId: string;
  submittedById: string;
  fileUrl: string;
  isExternalLink: boolean;
  version: number;
  isCurrent: boolean;
  submittedAt: string;
  reviewStatus: string;
  reviewComment: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  submittedBy: UserLite;
  reviewedBy: UserLite | null;
}

export interface ReminderRow {
  id: string;
  taskId: string;
  remindAt: string;
  isManual: boolean;
  sent: boolean;
  sentAt: string | null;
  createdAt: string;
}

const TASK_COLS = `
  id,
  team_id     AS "teamId",
  stage_id    AS "stageId",
  template_id AS "templateId",
  title,
  description,
  due_date    AS "dueDate",
  status,
  created_by  AS "createdById",
  created_at  AS "createdAt",
  updated_at  AS "updatedAt"
`;

const USER_JSON = (alias: string) => `
  jsonb_build_object(
    'id', ${alias}.id, 'name', ${alias}.name, 'email', ${alias}.email,
    'phone', ${alias}.phone, 'role', ${alias}.role, 'isActive', ${alias}.is_active,
    'lgpdConsentedAt', ${alias}.lgpd_consented_at,
    'createdAt', ${alias}.created_at, 'updatedAt', ${alias}.updated_at
  )`;

// --- templates ------------------------------------------------------

export async function listTemplates(stageId?: number): Promise<TaskTemplateRow[]> {
  const cols = `id, stage_id AS "stageId", title, description, created_at AS "createdAt"`;
  if (stageId === undefined) {
    return query<TaskTemplateRow>(
      `SELECT ${cols} FROM task_templates WHERE deleted_at IS NULL ORDER BY stage_id, title`,
    );
  }
  return query<TaskTemplateRow>(
    `SELECT ${cols} FROM task_templates WHERE stage_id = $1 AND deleted_at IS NULL ORDER BY title`,
    [stageId],
  );
}

export async function getTemplate(id: string): Promise<TaskTemplateRow | null> {
  return maybeOne<TaskTemplateRow>(
    `SELECT id, stage_id AS "stageId", title, description, created_at AS "createdAt"
       FROM task_templates WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
}

// --- tasks --------------------------------------------------------

export async function getTask(id: string): Promise<TaskRow | null> {
  return maybeOne<TaskRow>(
    `SELECT ${TASK_COLS} FROM tasks WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
}

export async function listTasksByTeam(teamId: string): Promise<TaskRow[]> {
  return query<TaskRow>(
    `SELECT ${TASK_COLS} FROM tasks WHERE team_id = $1 AND deleted_at IS NULL ORDER BY due_date, created_at`,
    [teamId],
  );
}

export async function listTasksForUser(userId: string): Promise<(TaskRow & { teamName: string })[]> {
  return query<TaskRow & { teamName: string }>(
    `SELECT t.id,
            t.team_id     AS "teamId",
            t.stage_id    AS "stageId",
            t.template_id AS "templateId",
            t.title,
            t.description,
            t.due_date    AS "dueDate",
            t.status,
            t.created_by  AS "createdById",
            t.created_at  AS "createdAt",
            t.updated_at  AS "updatedAt",
            tm.idea_name  AS "teamName"
       FROM tasks t
       JOIN teams tm ON tm.id = t.team_id AND tm.deleted_at IS NULL
       JOIN team_members m ON m.team_id = t.team_id AND m.deleted_at IS NULL
      WHERE m.user_id = $1 AND t.deleted_at IS NULL
      ORDER BY t.due_date, t.created_at`,
    [userId],
  );
}

export async function insertTask(
  input: {
    teamId: string;
    stageId: number;
    templateId: string | null;
    title: string;
    description: string | null;
    dueDate: string;
    createdById: string;
  },
): Promise<TaskRow> {
  const rows = await query<TaskRow>(
    `INSERT INTO tasks (team_id, stage_id, template_id, title, description, due_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${TASK_COLS}`,
    [
      input.teamId,
      input.stageId,
      input.templateId,
      input.title,
      input.description,
      input.dueDate,
      input.createdById,
    ],
  );
  return rows[0]!;
}

export async function updateTask(
  id: string,
  patch: { title?: string; description?: string | null; dueDate?: string },
): Promise<TaskRow | null> {
  const rows = await query<TaskRow>(
    `UPDATE tasks SET
        title       = COALESCE($2, title),
        description  = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE description END,
        due_date     = COALESCE($4::date, due_date),
        updated_at   = now()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING ${TASK_COLS}`,
    [id, patch.title ?? null, patch.description ?? null, patch.dueDate ?? null],
  );
  return rows[0] ?? null;
}

export async function setTaskStatus(
  client: PoolClient,
  id: string,
  status: string,
): Promise<TaskRow> {
  const r = await client.query<TaskRow>(
    `UPDATE tasks SET status = $2, updated_at = now() WHERE id = $1 RETURNING ${TASK_COLS}`,
    [id, status],
  );
  return r.rows[0]!;
}

// --- submissions -------------------------------------------------

export async function listSubmissions(taskIds: string[]): Promise<SubmissionRow[]> {
  if (taskIds.length === 0) return [];
  return query<SubmissionRow>(
    `SELECT s.id,
            s.task_id          AS "taskId",
            s.submitted_by     AS "submittedById",
            s.file_url         AS "fileUrl",
            s.is_external_link AS "isExternalLink",
            s.version,
            s.is_current       AS "isCurrent",
            s.submitted_at     AS "submittedAt",
            s.review_status    AS "reviewStatus",
            s.review_comment   AS "reviewComment",
            s.reviewed_by      AS "reviewedById",
            s.reviewed_at      AS "reviewedAt",
            ${USER_JSON("su")} AS "submittedBy",
            CASE WHEN ru.id IS NULL THEN NULL ELSE ${USER_JSON("ru")} END AS "reviewedBy"
       FROM task_submissions s
       JOIN users su ON su.id = s.submitted_by
       LEFT JOIN users ru ON ru.id = s.reviewed_by
      WHERE s.task_id = ANY($1::uuid[]) AND s.deleted_at IS NULL
      ORDER BY s.version DESC`,
    [taskIds],
  );
}

export async function getSubmission(id: string): Promise<SubmissionRow | null> {
  const rows = await listSubmissionsById(id);
  return rows[0] ?? null;
}

async function listSubmissionsById(id: string): Promise<SubmissionRow[]> {
  return query<SubmissionRow>(
    `SELECT s.id,
            s.task_id          AS "taskId",
            s.submitted_by     AS "submittedById",
            s.file_url         AS "fileUrl",
            s.is_external_link AS "isExternalLink",
            s.version,
            s.is_current       AS "isCurrent",
            s.submitted_at     AS "submittedAt",
            s.review_status    AS "reviewStatus",
            s.review_comment   AS "reviewComment",
            s.reviewed_by      AS "reviewedById",
            s.reviewed_at      AS "reviewedAt",
            ${USER_JSON("su")} AS "submittedBy",
            CASE WHEN ru.id IS NULL THEN NULL ELSE ${USER_JSON("ru")} END AS "reviewedBy"
       FROM task_submissions s
       JOIN users su ON su.id = s.submitted_by
       LEFT JOIN users ru ON ru.id = s.reviewed_by
      WHERE s.id = $1 AND s.deleted_at IS NULL`,
    [id],
  );
}

export async function insertSubmission(
  client: PoolClient,
  input: {
    taskId: string;
    submittedById: string;
    fileUrl: string;
    isExternalLink: boolean;
  },
): Promise<{ id: string; version: number }> {
  // Serializa as entregas da MESMA tarefa: sem o lock, duas requisições simultâneas leem o mesmo
  // MAX(version), geram a mesma versão e deixam mais de uma como "atual". O lock dura até o
  // COMMIT da transação de quem chama (tx()).
  await client.query("SELECT id FROM tasks WHERE id = $1 FOR UPDATE", [input.taskId]);
  await client.query(
    `UPDATE task_submissions SET is_current = false WHERE task_id = $1 AND deleted_at IS NULL`,
    [input.taskId],
  );
  const r = await client.query<{ id: string; version: number }>(
    `INSERT INTO task_submissions (task_id, submitted_by, file_url, is_external_link, version, is_current)
     VALUES ($1, $2, $3, $4,
             COALESCE((SELECT MAX(version) FROM task_submissions WHERE task_id = $1), 0) + 1,
             true)
     RETURNING id, version`,
    [input.taskId, input.submittedById, input.fileUrl, input.isExternalLink],
  );
  return r.rows[0]!;
}

export async function reviewSubmission(
  client: PoolClient,
  input: { id: string; decision: "APPROVED" | "REJECTED"; comment: string | null; reviewerId: string },
): Promise<void> {
  await client.query(
    `UPDATE task_submissions
        SET review_status = $2, review_comment = $3, reviewed_by = $4, reviewed_at = now()
      WHERE id = $1`,
    [input.id, input.decision, input.comment, input.reviewerId],
  );
}

// --- reminders --------------------------------------------------

export async function listReminders(taskIds: string[]): Promise<ReminderRow[]> {
  if (taskIds.length === 0) return [];
  return query<ReminderRow>(
    `SELECT id,
            task_id   AS "taskId",
            remind_at AS "remindAt",
            is_manual AS "isManual",
            sent,
            sent_at   AS "sentAt",
            created_at AS "createdAt"
       FROM task_reminders
      WHERE task_id = ANY($1::uuid[]) AND deleted_at IS NULL
      ORDER BY remind_at`,
    [taskIds],
  );
}

export async function insertReminder(input: {
  taskId: string;
  remindAt: string;
  isManual: boolean;
  sent: boolean;
}): Promise<ReminderRow> {
  const rows = await query<ReminderRow>(
    `INSERT INTO task_reminders (task_id, remind_at, is_manual, sent, sent_at)
     VALUES ($1, $2, $3, $4, CASE WHEN $4 THEN now() ELSE NULL END)
     RETURNING id, task_id AS "taskId", remind_at AS "remindAt", is_manual AS "isManual",
               sent, sent_at AS "sentAt", created_at AS "createdAt"`,
    [input.taskId, input.remindAt, input.isManual, input.sent],
  );
  return rows[0]!;
}

// --- destinatários de notificação -----------------------------

export async function teamMemberIds(teamId: string): Promise<string[]> {
  const rows = await query<{ user_id: string }>(
    `SELECT user_id FROM team_members WHERE team_id = $1 AND deleted_at IS NULL`,
    [teamId],
  );
  return rows.map((r) => r.user_id);
}

// --- soft delete ------------------------------------------------------

/** Exclusão lógica de uma tarefa, em cascata: marca a tarefa, suas
 * entregas e seus lembretes. Numa transação. `false` se já não existia. */
export async function softDeleteTaskCascade(taskId: string): Promise<boolean> {
  return tx(async (client) => {
    const hit = await client.query(
      `UPDATE tasks SET deleted_at = now(), updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL`,
      [taskId],
    );
    if (hit.rowCount === 0) return false;
    await client.query(
      `UPDATE task_submissions SET deleted_at = now() WHERE task_id = $1 AND deleted_at IS NULL`,
      [taskId],
    );
    await client.query(
      `UPDATE task_reminders SET deleted_at = now() WHERE task_id = $1 AND deleted_at IS NULL`,
      [taskId],
    );
    return true;
  });
}

/** Exclusão lógica de um modelo de tarefa (RF-11). Tarefas já criadas a
 * partir dele não são afetadas (template_id continua apontando). */
export async function softDeleteTemplate(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `UPDATE task_templates SET deleted_at = now()
      WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
    [id],
  );
  return rows.length > 0;
}

export async function adminIds(): Promise<string[]> {
  const rows = await query<{ id: string }>(`SELECT id FROM users WHERE role = 'ADMIN'`);
  return rows.map((r) => r.id);
}
