// Rótulos em PT-BR para os enums de types/enums.ts. Centralizado aqui
// pra não duplicar entre telas (admin, cadastro, detalhe da equipe).

import {
  IdeaMaturity,
  ReviewStatus,
  TaskStatus,
  TeamMemberRole,
  UserRole,
} from "@/types";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: "Administrador",
  [UserRole.MENTOR]: "Mentor",
  [UserRole.STUDENT]: "Aluno",
};

export const TEAM_MEMBER_ROLE_LABELS: Record<TeamMemberRole, string> = {
  [TeamMemberRole.LEADER]: "líder",
  [TeamMemberRole.MEMBER]: "integrante",
};

export const IDEA_MATURITY_LABELS: Record<IdeaMaturity, string> = {
  [IdeaMaturity.IDEA]: "Apenas ideia",
  [IdeaMaturity.PROTOTYPE]: "Protótipo",
  [IdeaMaturity.MVP_IN_PROGRESS]: "MVP em desenvolvimento",
  [IdeaMaturity.MVP_READY]: "MVP pronto",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: "Pendente",
  [TaskStatus.IN_PROGRESS]: "Em andamento",
  [TaskStatus.SUBMITTED]: "Entregue",
  [TaskStatus.LATE]: "Atrasada",
  [TaskStatus.APPROVED]: "Aprovada",
  [TaskStatus.REJECTED]: "Reprovada",
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  [ReviewStatus.PENDING]: "Em análise",
  [ReviewStatus.APPROVED]: "Aprovada",
  [ReviewStatus.REJECTED]: "Reprovada",
};
