// Camada de acesso ao funil de 6 etapas. A leitura das etapas vem do
// backend (B2, GET /journey-stages). A validação de transição (RN-01)
// ainda é mock aqui — a mutação de fato (Team.currentStageId,
// TeamStageHistory) fica em teams.service.ts e migra no B3.

import { MOCK_JOURNEY_STAGES } from "@/mocks/data";
import { apiFetch } from "@/lib/api-client";
import type { JourneyStage } from "@/types";
import { delay } from "./latency";

export async function getJourneyStages(): Promise<JourneyStage[]> {
  return apiFetch<JourneyStage[]>("/journey-stages");
}

/**
 * RN-01: uma equipe só avança de etapa quando as tarefas obrigatórias
 * daquela etapa estiverem aprovadas, ou por decisão manual do
 * mentor/admin. Continua mock nesta fase — migra junto com
 * advanceTeamStage (teams.service) no B3, quando a regra completa
 * (checar tarefas obrigatórias) entra no backend.
 */
export async function canAdvanceToStage(
  fromStageId: number,
  toStageId: number,
): Promise<boolean> {
  await delay(50);
  if (toStageId === fromStageId) return false;
  return MOCK_JOURNEY_STAGES.some((s) => s.id === toStageId);
}
