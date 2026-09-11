import { query } from "../../shared/sql.js";

export interface JourneyStageRow {
  id: number;
  number: number;
  name: string;
}

export interface IdeaAreaRow {
  id: number;
  name: string;
  createdAt: string;
}

/** As 6 etapas fixas do funil (RF-04 parcial). */
export async function listJourneyStages(): Promise<JourneyStageRow[]> {
  return query<JourneyStageRow>(
    "SELECT id, number, name FROM journey_stages ORDER BY number",
  );
}

/** Áreas/setores de ideia configuráveis (RF-04). Só as ativas. */
export async function listIdeaAreas(): Promise<IdeaAreaRow[]> {
  return query<IdeaAreaRow>(
    `SELECT id, name, created_at AS "createdAt"
       FROM idea_areas
      WHERE deleted_at IS NULL
      ORDER BY name`,
  );
}

/** Soft delete de uma área (RF-04). Não desvincula equipes que já a
 * usam — teams.area_id continua apontando pra linha, que some só das
 * listagens. */
export async function softDeleteIdeaArea(id: number): Promise<boolean> {
  const rows = await query<{ id: number }>(
    `UPDATE idea_areas SET deleted_at = now()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id`,
    [id],
  );
  return rows.length > 0;
}

/** Turmas/semestres com ao menos uma equipe — filtro por período (RF-24). */
export async function listCohorts(): Promise<string[]> {
  const rows = await query<{ cohort: string }>(
    "SELECT DISTINCT cohort FROM teams ORDER BY cohort DESC",
  );
  return rows.map((r) => r.cohort);
}
