// Camada de acesso ao funil de 6 etapas. A validação de transição
// (RN-01) fica aqui; a mutação de fato (Team.currentStageId,
// TeamStageHistory) fica em teams.service.ts, que chama esta validação
// antes de aplicar.

import { MOCK_JOURNEY_STAGES } from "@/mocks/data";
import type { JourneyStage } from "@/types";
import { delay } from "./latency";

export async function getJourneyStages(): Promise<JourneyStage[]> {
  await delay();
  return [...MOCK_JOURNEY_STAGES].sort((a, b) => a.number - b.number);
}

export async function getJourneyStageById(id: number): Promise<JourneyStage | null> {
  await delay();
  return MOCK_JOURNEY_STAGES.find((s) => s.id === id) ?? null;
}

/**
 * RN-01: uma equipe só avança de etapa quando as tarefas obrigatórias
 * daquela etapa estiverem aprovadas, ou por decisão manual do
 * mentor/admin. Nesta fase (mock), qualquer transição para uma etapa
 * diferente da atual é permitida — a UI é responsável por sinalizar ao
 * mentor/admin quando há tarefas pendentes na etapa atual (RF-09
 * continua manual). A função existe como ponto único de validação para
 * quando a regra completa (checar tarefas obrigatórias) entrar no
 * backend real.
 */
export async function canAdvanceToStage(
  fromStageId: number,
  toStageId: number,
): Promise<boolean> {
  await delay(50);
  if (toStageId === fromStageId) return false;
  const stages = MOCK_JOURNEY_STAGES.map((s) => s.id);
  return stages.includes(toStageId);
}
