// Camada de agregações para o dashboard (RF-22). Hoje calcula sobre os
// mocks em memória; amanhã vira uma query agregada real (COUNT/GROUP BY).

import { MOCK_JOURNEY_STAGES, MOCK_TASKS, MOCK_TEAMS } from "@/mocks/data";
import { TaskStatus } from "@/types";
import type { DashboardStats } from "@/types";
import { delay } from "./latency";

/** RF-22: indicadores gerais para a coordenação — equipes ativas,
 * distribuição por etapa, tarefas atrasadas, equipes prontas para o
 * InovAMF. Filtrável por turma/semestre (RF-24). */
export async function getDashboardStats(cohort?: string): Promise<DashboardStats> {
  await delay();

  const teams = cohort ? MOCK_TEAMS.filter((t) => t.cohort === cohort) : [...MOCK_TEAMS];
  const teamIds = new Set(teams.map((t) => t.id));

  const stages = [...MOCK_JOURNEY_STAGES].sort((a, b) => a.number - b.number);
  const byStage = stages.map((stage) => ({
    stageId: stage.id,
    stageName: stage.name,
    count: teams.filter((t) => t.currentStageId === stage.id).length,
  }));

  const lateTasksCount = MOCK_TASKS.filter(
    (t) => teamIds.has(t.teamId) && t.status === TaskStatus.LATE,
  ).length;

  const readyForInovamfCount = teams.filter((t) => t.isReadyForInovamf).length;

  return {
    totalActiveTeams: teams.length,
    byStage,
    lateTasksCount,
    readyForInovamfCount,
  };
}
