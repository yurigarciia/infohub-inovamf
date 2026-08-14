// Formatos de parâmetro que os services (mock e futuramente reais) recebem.
// Ver docs/frontend-plan.md, Seção 4.1 — a assinatura já nasce no formato
// que a consulta real vai aceitar.

import type { TaskStatus } from "./enums";

/** Filtros do painel do admin — funil/kanban (RF-06, RF-07, RF-24). */
export interface TeamFilters {
  search?: string;
  /** student_profiles.course é texto livre (sem tabela de lookup) — filtro por igualdade/contains. */
  course?: string;
  areaId?: number;
  taskStatus?: TaskStatus;
  mentorId?: string;
  cohort?: string;
}
