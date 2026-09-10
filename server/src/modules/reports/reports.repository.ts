import { maybeOne, query } from "../../shared/sql.js";

export interface DashboardStageCount {
  stageId: number;
  stageName: string;
  count: number;
}

export interface DashboardStats {
  totalActiveTeams: number;
  byStage: DashboardStageCount[];
  lateTasksCount: number;
  readyForInovamfCount: number;
  awaitingReviewCount: number;
}

/**
 * Indicadores do dashboard (RF-22), tudo em SQL agregado. `cohort`
 * opcional filtra por turma/semestre (RF-24). $1 = cohort ou NULL: a
 * cláusula `($1::text IS NULL OR cohort = $1)` cobre os dois casos.
 */
export async function dashboard(cohort: string | null): Promise<DashboardStats> {
  const teamFilter = `($1::text IS NULL OR t.cohort = $1)`;

  const totals = await maybeOne<{ totalActiveTeams: string; readyForInovamfCount: string }>(
    `SELECT COUNT(*)::int                                   AS "totalActiveTeams",
            COUNT(*) FILTER (WHERE t.is_ready_for_inovamf)::int AS "readyForInovamfCount"
       FROM teams t
      WHERE ${teamFilter}`,
    [cohort],
  );

  const byStage = await query<DashboardStageCount>(
    `SELECT s.id                                    AS "stageId",
            s.name                                  AS "stageName",
            COUNT(t.id) FILTER (WHERE ${teamFilter})::int AS "count"
       FROM journey_stages s
       LEFT JOIN teams t ON t.current_stage_id = s.id
      GROUP BY s.id, s.name
      ORDER BY s.number`,
    [cohort],
  );

  const taskCounts = await maybeOne<{ lateTasksCount: string; awaitingReviewCount: string }>(
    `SELECT COUNT(*) FILTER (WHERE tk.status = 'LATE')::int      AS "lateTasksCount",
            COUNT(*) FILTER (WHERE tk.status = 'SUBMITTED')::int AS "awaitingReviewCount"
       FROM tasks tk
       JOIN teams t ON t.id = tk.team_id
      WHERE ${teamFilter}`,
    [cohort],
  );

  return {
    totalActiveTeams: Number(totals?.totalActiveTeams ?? 0),
    readyForInovamfCount: Number(totals?.readyForInovamfCount ?? 0),
    byStage: byStage.map((r) => ({ ...r, count: Number(r.count) })),
    lateTasksCount: Number(taskCounts?.lateTasksCount ?? 0),
    awaitingReviewCount: Number(taskCounts?.awaitingReviewCount ?? 0),
  };
}
