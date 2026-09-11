import type { PoolClient } from "pg";
import { maybeOne, query, tx } from "../../shared/sql.js";

/**
 * SQL puro do módulo de equipes (B3). Sem regra de negócio — as
 * transações e a orquestração ficam em teams.service.ts.
 * Convenção: datas saem como ISO string (o front converte para Date).
 */

// --- shapes serializados (o que a API devolve) ----------------------

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

export interface TeamRow {
  id: string;
  ideaName: string;
  ideaDescription: string;
  areaId: number | null;
  ideaMaturity: string;
  sourceOrigin: string | null;
  cohort: string;
  currentStageId: number;
  isReadyForInovamf: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberRow {
  id: string;
  teamId: string;
  userId: string;
  memberRole: "LEADER" | "MEMBER";
  joinedAt: string;
  user: UserLite;
}

export interface TeamMentorRow {
  id: string;
  teamId: string;
  mentorId: string;
  assignedAt: string;
  mentor: UserLite;
}

export interface TeamStageHistoryRow {
  id: string;
  teamId: string;
  stageId: number;
  enteredAt: string;
  exitedAt: string | null;
  changedById: string | null;
}

export interface TeamNoteRow {
  id: string;
  teamId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: UserLite;
}

// sempre qualificado com o alias `t` — as queries abaixo usam
// `FROM teams t` / `UPDATE teams AS t` para evitar ambiguidade de `id`
// em joins com team_members.
const TEAM_COLS = `
  t.id,
  t.idea_name           AS "ideaName",
  t.idea_description     AS "ideaDescription",
  t.area_id             AS "areaId",
  t.idea_maturity       AS "ideaMaturity",
  t.source_origin       AS "sourceOrigin",
  t.cohort,
  t.current_stage_id    AS "currentStageId",
  t.is_ready_for_inovamf AS "isReadyForInovamf",
  t.created_at          AS "createdAt",
  t.updated_at          AS "updatedAt"
`;

const USER_JSON = (alias: string) => `
  jsonb_build_object(
    'id', ${alias}.id,
    'name', ${alias}.name,
    'email', ${alias}.email,
    'phone', ${alias}.phone,
    'role', ${alias}.role,
    'isActive', ${alias}.is_active,
    'lgpdConsentedAt', ${alias}.lgpd_consented_at,
    'createdAt', ${alias}.created_at,
    'updatedAt', ${alias}.updated_at
  )`;

// --- leitura -------------------------------------------------------------

export interface BoardFilters {
  search?: string;
  course?: string;
  areaId?: number;
  taskStatus?: string;
  mentorId?: string;
  cohort?: string;
}

/** Painel do admin (RF-06/07/24). WHERE dinâmico com params posicionais. */
export async function listTeams(filters: BoardFilters): Promise<TeamRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (clause: string, value: unknown) => {
    params.push(value);
    where.push(clause.replace("$?", `$${params.length}`));
  };

  if (filters.search) add(`t.idea_name ILIKE '%' || $? || '%'`, filters.search.trim());
  if (filters.areaId !== undefined) add(`t.area_id = $?`, filters.areaId);
  if (filters.cohort) add(`t.cohort = $?`, filters.cohort);
  if (filters.mentorId) {
    add(
      `EXISTS (SELECT 1 FROM team_mentors tm WHERE tm.team_id = t.id AND tm.deleted_at IS NULL AND tm.mentor_id = $?)`,
      filters.mentorId,
    );
  }
  if (filters.taskStatus) {
    add(
      `EXISTS (SELECT 1 FROM tasks tk WHERE tk.team_id = t.id AND tk.deleted_at IS NULL AND tk.status = $?)`,
      filters.taskStatus,
    );
  }
  if (filters.course) {
    add(
      `EXISTS (
         SELECT 1 FROM team_members m
         JOIN student_profiles sp ON sp.user_id = m.user_id
         WHERE m.team_id = t.id AND m.deleted_at IS NULL AND sp.course ILIKE '%' || $? || '%'
       )`,
      filters.course.trim(),
    );
  }

  where.unshift("t.deleted_at IS NULL");
  const sql = `
    SELECT ${TEAM_COLS}
    FROM teams t
    WHERE ${where.join(" AND ")}
    ORDER BY t.created_at DESC
  `;
  return query<TeamRow>(sql, params);
}

/** Equipes que um aluno integra (RF, área do aluno). */
export async function listTeamsForUser(userId: string): Promise<TeamRow[]> {
  return query<TeamRow>(
    `SELECT ${TEAM_COLS}
       FROM teams t
       JOIN team_members m ON m.team_id = t.id AND m.deleted_at IS NULL
      WHERE m.user_id = $1 AND t.deleted_at IS NULL
      ORDER BY t.created_at DESC`,
    [userId],
  );
}

export async function getTeam(teamId: string): Promise<TeamRow | null> {
  return maybeOne<TeamRow>(
    `SELECT ${TEAM_COLS} FROM teams t WHERE t.id = $1 AND t.deleted_at IS NULL`,
    [teamId],
  );
}

/** Membros (com usuário) de várias equipes de uma vez — para o board. */
export async function listMembers(teamIds: string[]): Promise<TeamMemberRow[]> {
  if (teamIds.length === 0) return [];
  return query<TeamMemberRow>(
    `SELECT m.id,
            m.team_id     AS "teamId",
            m.user_id     AS "userId",
            m.member_role AS "memberRole",
            m.joined_at   AS "joinedAt",
            ${USER_JSON("u")} AS user
       FROM team_members m
       JOIN users u ON u.id = m.user_id
      WHERE m.team_id = ANY($1::uuid[]) AND m.deleted_at IS NULL
      ORDER BY m.member_role DESC, u.name`,
    [teamIds],
  );
}

export async function listMentors(teamId: string): Promise<TeamMentorRow[]> {
  return query<TeamMentorRow>(
    `SELECT tm.id,
            tm.team_id    AS "teamId",
            tm.mentor_id  AS "mentorId",
            tm.assigned_at AS "assignedAt",
            ${USER_JSON("u")} AS mentor
       FROM team_mentors tm
       JOIN users u ON u.id = tm.mentor_id
      WHERE tm.team_id = $1 AND tm.deleted_at IS NULL
      ORDER BY u.name`,
    [teamId],
  );
}

export async function listStageHistory(teamId: string): Promise<TeamStageHistoryRow[]> {
  return query<TeamStageHistoryRow>(
    `SELECT id,
            team_id    AS "teamId",
            stage_id   AS "stageId",
            entered_at AS "enteredAt",
            exited_at  AS "exitedAt",
            changed_by AS "changedById"
       FROM team_stage_history
      WHERE team_id = $1
      ORDER BY entered_at`,
    [teamId],
  );
}

export async function listNotes(teamId: string): Promise<TeamNoteRow[]> {
  return query<TeamNoteRow>(
    `SELECT n.id,
            n.team_id   AS "teamId",
            n.author_id AS "authorId",
            n.content,
            n.created_at AS "createdAt",
            ${USER_JSON("u")} AS author
       FROM team_notes n
       JOIN users u ON u.id = n.author_id
      WHERE n.team_id = $1 AND n.deleted_at IS NULL
      ORDER BY n.created_at DESC`,
    [teamId],
  );
}

/** true se o aluno integra a equipe / o mentor está atribuído a ela (só vínculos ativos). */
export async function isMember(teamId: string, userId: string): Promise<boolean> {
  const row = await maybeOne<{ x: number }>(
    `SELECT 1 AS x FROM team_members WHERE team_id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [teamId, userId],
  );
  return row !== null;
}

export async function isAssignedMentor(teamId: string, mentorId: string): Promise<boolean> {
  const row = await maybeOne<{ x: number }>(
    `SELECT 1 AS x FROM team_mentors WHERE team_id = $1 AND mentor_id = $2 AND deleted_at IS NULL`,
    [teamId, mentorId],
  );
  return row !== null;
}

// --- escrita (usadas dentro de transação) ------------------------------

export interface StudentInsert {
  name: string;
  email: string;
  phone: string | null;
  course: string;
  period: string;
  lgpdConsentedAt: Date | null;
  passwordHash: string;
}

export async function findUserByEmail(
  client: PoolClient,
  email: string,
): Promise<{ id: string; role: string } | null> {
  const r = await client.query<{ id: string; role: string }>(
    `SELECT id, role FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
  return r.rows[0] ?? null;
}

export async function insertStudent(client: PoolClient, s: StudentInsert): Promise<string> {
  const r = await client.query<{ id: string }>(
    `INSERT INTO users (name, email, phone, role, lgpd_consented_at, password_hash)
     VALUES ($1, $2, $3, 'STUDENT', $4, $5)
     RETURNING id`,
    [s.name, s.email, s.phone, s.lgpdConsentedAt, s.passwordHash],
  );
  const id = r.rows[0]!.id;
  await client.query(
    `INSERT INTO student_profiles (user_id, course, period) VALUES ($1, $2, $3)`,
    [id, s.course, s.period],
  );
  return id;
}

export async function insertTeam(
  client: PoolClient,
  t: {
    ideaName: string;
    ideaDescription: string;
    areaId: number | null;
    ideaMaturity: string;
    sourceOrigin: string | null;
    cohort: string;
  },
): Promise<string> {
  const r = await client.query<{ id: string }>(
    `INSERT INTO teams
       (idea_name, idea_description, area_id, idea_maturity, source_origin, cohort, current_stage_id)
     VALUES ($1, $2, $3, $4, $5, $6, 1)
     RETURNING id`,
    [t.ideaName, t.ideaDescription, t.areaId, t.ideaMaturity, t.sourceOrigin, t.cohort],
  );
  return r.rows[0]!.id;
}

export async function insertMember(
  client: PoolClient,
  teamId: string,
  userId: string,
  role: "LEADER" | "MEMBER",
): Promise<void> {
  await client.query(
    `INSERT INTO team_members (team_id, user_id, member_role) VALUES ($1, $2, $3)
     ON CONFLICT (team_id, user_id) WHERE deleted_at IS NULL DO NOTHING`,
    [teamId, userId, role],
  );
}

export async function openStageHistory(
  client: PoolClient,
  teamId: string,
  stageId: number,
  changedById: string | null,
): Promise<void> {
  await client.query(
    `INSERT INTO team_stage_history (team_id, stage_id, changed_by) VALUES ($1, $2, $3)`,
    [teamId, stageId, changedById],
  );
}

export async function closeOpenStageHistory(client: PoolClient, teamId: string): Promise<void> {
  await client.query(
    `UPDATE team_stage_history SET exited_at = now()
      WHERE team_id = $1 AND exited_at IS NULL`,
    [teamId],
  );
}

export async function updateCurrentStage(
  client: PoolClient,
  teamId: string,
  stageId: number,
): Promise<TeamRow> {
  const r = await client.query<TeamRow>(
    `UPDATE teams AS t
        SET current_stage_id = $2,
            is_ready_for_inovamf = CASE WHEN $2 = 6 THEN t.is_ready_for_inovamf ELSE false END,
            updated_at = now()
      WHERE t.id = $1 AND t.deleted_at IS NULL
      RETURNING ${TEAM_COLS}`,
    [teamId, stageId],
  );
  return r.rows[0]!;
}

export async function insertNote(
  teamId: string,
  authorId: string,
  content: string,
): Promise<TeamNoteRow> {
  const rows = await query<{ id: string; createdAt: string }>(
    `INSERT INTO team_notes (team_id, author_id, content) VALUES ($1, $2, $3)
     RETURNING id, created_at AS "createdAt"`,
    [teamId, authorId, content],
  );
  const notes = await listNotes(teamId);
  return notes.find((n) => n.id === rows[0]!.id)!;
}

export async function listAdminIds(): Promise<string[]> {
  const rows = await query<{ id: string }>(`SELECT id FROM users WHERE role = 'ADMIN'`);
  return rows.map((r) => r.id);
}

// --- soft delete ------------------------------------------------------

/**
 * Exclusão lógica de uma equipe, em cascata: marca `deleted_at` na
 * equipe e em tudo que pende dela (membros, mentores, notas, tarefas,
 * entregas e lembretes das tarefas). Numa transação. Devolve `false` se
 * a equipe não existe ou já estava excluída.
 * team_stage_history NÃO é marcado — é histórico, fica como registro.
 */
export async function softDeleteTeamCascade(teamId: string): Promise<boolean> {
  return tx(async (client) => {
    const hit = await client.query(
      `UPDATE teams SET deleted_at = now(), updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL`,
      [teamId],
    );
    if (hit.rowCount === 0) return false;

    await client.query(
      `UPDATE task_reminders SET deleted_at = now()
        WHERE deleted_at IS NULL AND task_id IN (SELECT id FROM tasks WHERE team_id = $1)`,
      [teamId],
    );
    await client.query(
      `UPDATE task_submissions SET deleted_at = now()
        WHERE deleted_at IS NULL AND task_id IN (SELECT id FROM tasks WHERE team_id = $1)`,
      [teamId],
    );
    await client.query(
      `UPDATE tasks SET deleted_at = now(), updated_at = now()
        WHERE team_id = $1 AND deleted_at IS NULL`,
      [teamId],
    );
    await client.query(
      `UPDATE team_notes SET deleted_at = now() WHERE team_id = $1 AND deleted_at IS NULL`,
      [teamId],
    );
    await client.query(
      `UPDATE team_members SET deleted_at = now() WHERE team_id = $1 AND deleted_at IS NULL`,
      [teamId],
    );
    await client.query(
      `UPDATE team_mentors SET deleted_at = now() WHERE team_id = $1 AND deleted_at IS NULL`,
      [teamId],
    );
    return true;
  });
}

/** Exclusão lógica de uma anotação interna (RF-10). */
export async function softDeleteNote(noteId: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `UPDATE team_notes SET deleted_at = now()
      WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
    [noteId],
  );
  return rows.length > 0;
}
