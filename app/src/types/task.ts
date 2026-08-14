// Espelha os models TaskTemplate/Task/TaskSubmission/TaskReminder de
// app/prisma/schema.prisma.

import type { ReviewStatus, TaskStatus } from "./enums";
import type { User } from "./user";

/** Modelo de tarefa pré-configurado por etapa (RF-11). */
export interface TaskTemplate {
  id: string;
  stageId: number;
  title: string;
  description: string | null;
  createdAt: Date;
}

/** Tarefa atribuída a uma equipe (RF-11 a RF-13, RN-04). */
export interface Task {
  id: string;
  teamId: string;
  stageId: number;
  templateId: string | null;
  title: string;
  description: string | null;
  dueDate: Date;
  status: TaskStatus;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Entrega de uma tarefa, com histórico de versões (RF-14 a RF-16).
 * isExternalLink cobre o Pitch Vídeo, que é sempre link (Q3). */
export interface TaskSubmission {
  id: string;
  taskId: string;
  submittedById: string;
  fileUrl: string;
  isExternalLink: boolean;
  version: number;
  isCurrent: boolean;
  submittedAt: Date;
  reviewStatus: ReviewStatus;
  reviewComment: string | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
}

/** Data de lembrete configurada por tarefa (RF-17, RF-18, RF-20). */
export interface TaskReminder {
  id: string;
  taskId: string;
  remindAt: Date;
  isManual: boolean;
  sent: boolean;
  sentAt: Date | null;
  createdAt: Date;
}

/** Entrega já resolvida com quem enviou/revisou (join). */
export interface TaskSubmissionWithUsers extends TaskSubmission {
  submittedBy: User;
  reviewedBy: User | null;
}

/** "View" usada na área do aluno (RF-13) e na página de detalhe da equipe:
 * tarefa com entregas e lembretes já resolvidos. */
export interface TaskWithDetails extends Task {
  submissions: TaskSubmissionWithUsers[];
  reminders: TaskReminder[];
}
