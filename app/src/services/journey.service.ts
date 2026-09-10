// Camada de acesso ao funil de 6 etapas. A leitura vem do backend
// (B2, GET /journey-stages). A validação de transição (RN-01) e a
// mutação (Team.currentStageId + TeamStageHistory) moram no servidor
// (POST /teams/:id/stage — ver teams.service).

import { apiFetch } from "@/lib/api-client";
import type { JourneyStage } from "@/types";

export async function getJourneyStages(): Promise<JourneyStage[]> {
  return apiFetch<JourneyStage[]>("/journey-stages");
}
