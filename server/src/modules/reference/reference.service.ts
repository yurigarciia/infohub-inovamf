import * as repo from "./reference.repository.js";
import type { IdeaAreaRow, JourneyStageRow } from "./reference.repository.js";

/**
 * Dados de referência (B2) — etapas do funil, áreas de ideia e turmas.
 * Somente leitura; sem regra de negócio, só repassa o repositório.
 */
export async function getJourneyStages(): Promise<JourneyStageRow[]> {
  return repo.listJourneyStages();
}

export async function getIdeaAreas(): Promise<IdeaAreaRow[]> {
  return repo.listIdeaAreas();
}

export async function getCohorts(): Promise<string[]> {
  return repo.listCohorts();
}
