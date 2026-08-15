// Camada de acesso a tarefas e entregas. Hoje lê/escreve nos mocks em
// memória; amanhã troca para Prisma/API sem mudar as assinaturas (ver
// docs/frontend-plan.md, Seção 4.1).

import {
  MOCK_TASK_SUBMISSIONS,
  MOCK_TASK_TEMPLATES,
  MOCK_TASKS,
  MOCK_TEAM_MEMBERS,
  MOCK_TEAMS,
  MOCK_USERS,
} from "@/mocks/data";
import { generateId } from "@/mocks/utils";
import { ReviewStatus, TaskStatus, UserRole } from "@/types";
import type {
  Task,
  TaskSubmission,
  TaskSubmissionWithUsers,
  TaskTemplate,
  TaskWithDetails,
  TaskWithTeam,
} from "@/types";
import { delay } from "./latency";
import { recordNotification } from "./notifications.service";

function toSubmissionWithUsers(submission: TaskSubmission): TaskSubmissionWithUsers {
  const submittedBy = MOCK_USERS.find((u) => u.id === submission.submittedById);
  if (!submittedBy) throw new Error(`Usuário ${submission.submittedById} não encontrado.`);
  const reviewedBy = submission.reviewedById
    ? (MOCK_USERS.find((u) => u.id === submission.reviewedById) ?? null)
    : null;
  return { ...submission, submittedBy, reviewedBy };
}

function toTaskWithDetails(task: Task): TaskWithDetails {
  const submissions = MOCK_TASK_SUBMISSIONS.filter((s) => s.taskId === task.id)
    .map(toSubmissionWithUsers)
    .sort((a, b) => b.version - a.version);
  return { ...task, submissions, reminders: [] };
}

/** Página de detalhe da equipe (RF-08) e lista de tarefas por equipe. */
export async function getTasksForTeam(teamId: string): Promise<TaskWithDetails[]> {
  await delay();
  return MOCK_TASKS.filter((t) => t.teamId === teamId).map(toTaskWithDetails);
}

/** Área do aluno — tarefas de todas as equipes que ele integra (RF-13),
 * já que um aluno pode participar de mais de uma equipe (Q4). */
export async function getTasksForStudent(userId: string): Promise<TaskWithTeam[]> {
  await delay();
  const teamIds = new Set(
    MOCK_TEAM_MEMBERS.filter((m) => m.userId === userId).map((m) => m.teamId),
  );
  return MOCK_TASKS.filter((t) => teamIds.has(t.teamId)).map((task) => {
    const team = MOCK_TEAMS.find((t) => t.id === task.teamId);
    if (!team) throw new Error(`Equipe ${task.teamId} não encontrada.`);
    return { ...toTaskWithDetails(task), team: { id: team.id, ideaName: team.ideaName } };
  });
}

export async function getTaskDetail(taskId: string): Promise<TaskWithDetails> {
  await delay();
  const task = MOCK_TASKS.find((t) => t.id === taskId);
  if (!task) throw new Error(`Tarefa ${taskId} não encontrada.`);
  return toTaskWithDetails(task);
}

/** Modelos de tarefa pré-configurados por etapa (RF-11). Sem `stageId`,
 * devolve todos — usado pelo admin ao escolher um template na criação. */
export async function getTaskTemplates(stageId?: number): Promise<TaskTemplate[]> {
  await delay();
  return stageId === undefined
    ? [...MOCK_TASK_TEMPLATES]
    : MOCK_TASK_TEMPLATES.filter((t) => t.stageId === stageId);
}

export interface CreateTaskInput {
  teamId: string;
  stageId: number;
  templateId?: string;
  title: string;
  description?: string;
  dueDate: Date;
  createdById: string;
}

/** RF-11, RF-12: cria uma tarefa avulsa ou a partir de um template. */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  await delay();
  const now = new Date();
  const task: Task = {
    id: generateId("task"),
    teamId: input.teamId,
    stageId: input.stageId,
    templateId: input.templateId ?? null,
    title: input.title,
    description: input.description ?? null,
    dueDate: input.dueDate,
    status: TaskStatus.PENDING,
    createdById: input.createdById,
    createdAt: now,
    updatedAt: now,
  };
  MOCK_TASKS.push(task);

  const members = MOCK_TEAM_MEMBERS.filter((m) => m.teamId === input.teamId);
  for (const member of members) {
    await recordNotification({
      recipientUserId: member.userId,
      type: "TASK_ASSIGNED",
      subject: `Nova tarefa: ${task.title}`,
      relatedTeamId: task.teamId,
      relatedTaskId: task.id,
    });
  }

  return task;
}

export interface UpdateTaskInput {
  taskId: string;
  title?: string;
  description?: string;
  dueDate?: Date;
}

/** RF-12: editar prazo/descrição/título de uma tarefa já criada. */
export async function updateTask(input: UpdateTaskInput): Promise<Task> {
  await delay();
  const task = MOCK_TASKS.find((t) => t.id === input.taskId);
  if (!task) throw new Error(`Tarefa ${input.taskId} não encontrada.`);

  if (input.title !== undefined) task.title = input.title;
  if (input.description !== undefined) task.description = input.description;
  if (input.dueDate !== undefined) task.dueDate = input.dueDate;
  task.updatedAt = new Date();

  return task;
}

export interface SubmitTaskInput {
  taskId: string;
  submittedById: string;
  fileUrl: string;
  isExternalLink: boolean;
}

/** RF-14: envio de entrega (arquivo ou link — Q3 no caso do Pitch Vídeo).
 * RF-16: mantém as versões anteriores, marcando só a nova como atual. */
export async function submitTask(input: SubmitTaskInput): Promise<TaskSubmission> {
  const task = MOCK_TASKS.find((t) => t.id === input.taskId);
  if (!task) throw new Error(`Tarefa ${input.taskId} não encontrada.`);

  await delay();
  const now = new Date();

  const previousSubmissions = MOCK_TASK_SUBMISSIONS.filter((s) => s.taskId === input.taskId);
  for (const previous of previousSubmissions) previous.isCurrent = false;
  const nextVersion = previousSubmissions.length
    ? Math.max(...previousSubmissions.map((s) => s.version)) + 1
    : 1;

  const submission: TaskSubmission = {
    id: generateId("sub"),
    taskId: input.taskId,
    submittedById: input.submittedById,
    fileUrl: input.fileUrl,
    isExternalLink: input.isExternalLink,
    version: nextVersion,
    isCurrent: true,
    submittedAt: now,
    reviewStatus: ReviewStatus.PENDING,
    reviewComment: null,
    reviewedById: null,
    reviewedAt: null,
  };
  MOCK_TASK_SUBMISSIONS.push(submission);

  task.status = TaskStatus.SUBMITTED;
  task.updatedAt = now;

  const admins = MOCK_USERS.filter((u) => u.role === UserRole.ADMIN);
  for (const admin of admins) {
    await recordNotification({
      recipientUserId: admin.id,
      type: "FILE_SUBMITTED",
      subject: `Novo arquivo entregue: ${task.title}`,
      relatedTeamId: task.teamId,
      relatedTaskId: task.id,
    });
  }

  return submission;
}

export interface ReviewSubmissionInput {
  submissionId: string;
  reviewedById: string;
  decision: typeof ReviewStatus.APPROVED | typeof ReviewStatus.REJECTED;
  reviewComment?: string;
}

/** RF-15: aprovar (conclui a tarefa) ou reprovar (reabre com comentário). */
export async function reviewSubmission(input: ReviewSubmissionInput): Promise<TaskSubmission> {
  const submission = MOCK_TASK_SUBMISSIONS.find((s) => s.id === input.submissionId);
  if (!submission) throw new Error(`Entrega ${input.submissionId} não encontrada.`);
  const task = MOCK_TASKS.find((t) => t.id === submission.taskId);
  if (!task) throw new Error(`Tarefa ${submission.taskId} não encontrada.`);

  await delay();
  const now = new Date();

  submission.reviewStatus = input.decision;
  submission.reviewComment = input.reviewComment ?? null;
  submission.reviewedById = input.reviewedById;
  submission.reviewedAt = now;

  task.status = input.decision === ReviewStatus.APPROVED ? TaskStatus.APPROVED : TaskStatus.REJECTED;
  task.updatedAt = now;

  await recordNotification({
    recipientUserId: submission.submittedById,
    type: input.decision === ReviewStatus.APPROVED ? "SUBMISSION_APPROVED" : "SUBMISSION_REJECTED",
    subject:
      input.decision === ReviewStatus.APPROVED
        ? `Entrega aprovada: ${task.title}`
        : `Ajustes solicitados: ${task.title}`,
    relatedTeamId: task.teamId,
    relatedTaskId: task.id,
  });

  return submission;
}
