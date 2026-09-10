// Camada de agregações para o dashboard (RF-22). Lê do backend
// (GET /reports/dashboard), que faz COUNT/GROUP BY em SQL.

import { apiFetch } from "@/lib/api-client";
import type { DashboardStats } from "@/types";

/** RF-22: indicadores gerais para a coordenação — equipes ativas,
 * distribuição por etapa, tarefas atrasadas, aguardando aprovação,
 * equipes prontas para o InovAMF. Filtrável por turma/semestre (RF-24). */
export async function getDashboardStats(cohort?: string): Promise<DashboardStats> {
  const suffix = cohort ? `?cohort=${encodeURIComponent(cohort)}` : "";
  return apiFetch<DashboardStats>(`/reports/dashboard${suffix}`);
}
