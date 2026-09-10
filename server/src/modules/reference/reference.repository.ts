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

/** Áreas/setores de ideia configuráveis (RF-04). */
export async function listIdeaAreas(): Promise<IdeaAreaRow[]> {
  return query<IdeaAreaRow>(
    `SELECT id, name, created_at AS "createdAt" FROM idea_areas ORDER BY name`,
  );
}

/** Turmas/semestres com ao menos uma equipe — filtro por período (RF-24). */
export async function listCohorts(): Promise<string[]> {
  const rows = await query<{ cohort: string }>(
    "SELECT DISTINCT cohort FROM teams ORDER BY cohort DESC",
  );
  return rows.map((r) => r.cohort);
}
