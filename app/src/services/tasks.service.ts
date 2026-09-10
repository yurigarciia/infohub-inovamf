// Camada de acesso a tarefas, entregas, revisão e lembretes (B4). Fala
// com o backend (server/) via api-client; as telas que importam de
// @/services não mudam. Datas chegam como ISO string / DATE e são
// convertidas para Date aqui na fronteira.

import { apiFetch } from "@/lib/api-client";
import { ReviewStatus } from "@/types";
import type {
  Task,
  TaskReminder,
  TaskSubmission,
  TaskSubmissionWithUsers,
  TaskTemplate,
  TaskWithDetails,
  TaskWithTeam,
  User,
} from "@/types";

// --- shapes crus da API -------------------------------------------

interface RawUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: User["role"];
  isActive: boolean;
  lgpdConsentedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
interface RawTask {
  id: string;
  teamId: string;
  stageId: number;
  templateId: string | null;
  title: string;
  description: string | null;
  dueDate: string;
  status: Task["status"];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}
interface RawSubmission {
  id: string;
  taskId: string;
  submittedById: string;
  fileUrl: string;
  isExternalLink: boolean;
  version: number;
  isCurrent: boolean;
  submittedAt: string;
  reviewStatus: TaskSubmission["reviewStatus"];
  reviewComment: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  submittedBy: RawUser;
  reviewedBy: RawUser | null;
}
interface RawReminder {
  id: string;
  taskId: string;
  remindAt: string;
  isManual: boolean;
  sent: boolean;
  sentAt: string | null;
  createdAt: string;
}
interface RawTaskDetails extends RawTask {
  submissions: RawSubmission[];
  reminders: RawReminder[];
}
interface RawTaskWithTeam extends RawTaskDetails {
  team: { id: string; ideaName: string };
}

// --- conversão --------------------------------------------------

const toUser = (u: RawUser): User => ({
  ...u,
  lgpdConsentedAt: u.lgpdConsentedAt ? new Date(u.lgpdConsentedAt) : null,
  createdAt: new Date(u.createdAt),
  updatedAt: new Date(u.updatedAt),
});

const toTask = (t: RawTask): Task => ({
  ...t,
  dueDate: new Date(t.dueDate),
  createdAt: new Date(t.createdAt),
  updatedAt: new Date(t.updatedAt),
});

const toSubmission = (s: RawSubmission): TaskSubmissionWithUsers => ({
  ...s,
  submittedAt: new Date(s.submittedAt),
  reviewedAt: s.reviewedAt ? new Date(s.reviewedAt) : null,
  submittedBy: toUser(s.submittedBy),
  reviewedBy: s.reviewedBy ? toUser(s.reviewedBy) : null,
});

const toReminder = (r: RawReminder): TaskReminder => ({
  ...r,
  remindAt: new Date(r.remindAt),
  sentAt: r.sentAt ? new Date(r.sentAt) : null,
  createdAt: new Date(r.createdAt),
});

const toDetails = (t: RawTaskDetails): TaskWithDetails => ({
  ...toTask(t),
  submissions: t.submissions.map(toSubmission),
  reminders: t.reminders.map(toReminder),
});

const toDateOnly = (d: Date): string => d.toISOString().slice(0, 10);

// --- leitura ---------------------------------------------------

/** Tarefas de uma equipe, com entregas e lembretes (RF-08/13). */
export async function getTasksForTeam(teamId: string): Promise<TaskWithDetails[]> {
  const rows = await apiFetch<RawTaskDetails[]>(`/teams/${teamId}/tasks`);
  return rows.map(toDetails);
}

/** Área do aluno — tarefas de todas as equipes que ele integra (RF-13).
 * O backend usa o token; o parâmetro fica só pela compatibilidade. */
export async function getTasksForStudent(_userId?: string): Promise<TaskWithTeam[]> {
  void _userId;
  const rows = await apiFetch<RawTaskWithTeam[]>("/tasks/mine");
  return rows.map((t) => ({ ...toDetails(t), team: t.team }));
}

/** Modelos de tarefa por etapa (RF-11). */
export async function getTaskTemplates(stageId?: number): Promise<TaskTemplate[]> {
  const suffix = stageId === undefined ? "" : `?stageId=${stageId}`;
  const rows = await apiFetch<{ id: string; stageId: number; title: string; description: string | null; createdAt: string }[]>(
    `/task-templates${suffix}`,
  );
  return rows.map((r) => ({ ...r, createdAt: new Date(r.createdAt) }));
}

// --- criação / edição (RF-11/12) ------------------------------

export interface CreateTaskInput {
  teamId: string;
  stageId: number;
  templateId?: string;
  title: string;
  description?: string;
  dueDate: Date;
  createdById?: string;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { createdById: _drop, dueDate, ...rest } = input;
  void _drop;
  return toTask(
    await apiFetch<RawTask>("/tasks", {
      method: "POST",
      body: { ...rest, dueDate: toDateOnly(dueDate) },
    }),
  );
}

export interface UpdateTaskInput {
  taskId: string;
  title?: string;
  description?: string;
  dueDate?: Date;
}

export async function updateTask(input: UpdateTaskInput): Promise<Task> {
  const { taskId, dueDate, ...rest } = input;
  return toTask(
    await apiFetch<RawTask>(`/tasks/${taskId}`, {
      method: "PATCH",
      body: { ...rest, ...(dueDate ? { dueDate: toDateOnly(dueDate) } : {}) },
    }),
  );
}

// --- entrega (RF-14/16) --------------------------------------

export interface SubmitTaskInput {
  taskId: string;
  submittedById?: string;
  /** upload de arquivo (PDF/imagem/vídeo) */
  file?: File;
  /** link externo — Pitch Vídeo (Q3) */
  externalLink?: string;
  /** compat: algumas telas ainda passam isExternalLink explicitamente */
  isExternalLink?: boolean;
  /** compat antigo: URL já resolvida (ignorada se `file`/`externalLink` vierem) */
  fileUrl?: string;
}

export async function submitTask(input: SubmitTaskInput): Promise<TaskSubmission> {
  const path = `/tasks/${input.taskId}/submissions`;
  if (input.file) {
    const form = new FormData();
    form.append("file", input.file);
    return toSubmission(await apiFetch<RawSubmission>(path, { method: "POST", body: form }));
  }
  const link = input.externalLink ?? input.fileUrl;
  if (!link) throw new Error("Envie um arquivo ou um link.");
  return toSubmission(
    await apiFetch<RawSubmission>(path, { method: "POST", body: { externalLink: link } }),
  );
}

// --- revisão (RF-15) ----------------------------------------

export interface ReviewSubmissionInput {
  submissionId: string;
  reviewedById?: string;
  decision: typeof ReviewStatus.APPROVED | typeof ReviewStatus.REJECTED;
  reviewComment?: string;
}

export async function reviewSubmission(input: ReviewSubmissionInput): Promise<TaskSubmission> {
  return toSubmission(
    await apiFetch<RawSubmission>(`/submissions/${input.submissionId}/review`, {
      method: "POST",
      body: { decision: input.decision, reviewComment: input.reviewComment },
    }),
  );
}

// --- lembretes (RF-17/20) ---------------------------------

export async function configureReminder(taskId: string, remindAt: Date): Promise<TaskReminder> {
  return toReminder(
    await apiFetch<RawReminder>(`/tasks/${taskId}/reminders`, {
      method: "POST",
      body: { remindAt: remindAt.toISOString() },
    }),
  );
}

export async function sendManualReminder(taskId: string): Promise<TaskReminder> {
  return toReminder(
    await apiFetch<RawReminder>(`/tasks/${taskId}/reminders`, {
      method: "POST",
      body: { manual: true },
    }),
  );
}
