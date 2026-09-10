import { tx } from "../../shared/sql.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../shared/errors.js";
import { recordAuditLog } from "../audit/audit.service.js";
import { recordNotification } from "../notifications/notifications.service.js";
import { assertCanManageTeam, assertCanSeeTeam } from "../teams/teams.service.js";
import type { Actor } from "../teams/teams.service.js";
import * as repo from "./tasks.repository.js";
import type { ReminderRow, SubmissionRow, TaskRow, TaskTemplateRow } from "./tasks.repository.js";

// --- views (espelham TaskWithDetails / TaskWithTeam do front) --------

export interface TaskWithDetails extends TaskRow {
  submissions: SubmissionRow[];
  reminders: ReminderRow[];
}
export interface TaskWithTeam extends TaskWithDetails {
  team: { id: string; ideaName: string };
}

async function decorate(tasks: TaskRow[]): Promise<TaskWithDetails[]> {
  if (tasks.length === 0) return [];
  const ids = tasks.map((t) => t.id);
  const [subs, reminders] = await Promise.all([
    repo.listSubmissions(ids),
    repo.listReminders(ids),
  ]);
  const subsByTask = new Map<string, SubmissionRow[]>();
  const remByTask = new Map<string, ReminderRow[]>();
  for (const s of subs) {
    const list = subsByTask.get(s.taskId) ?? [];
    list.push(s);
    subsByTask.set(s.taskId, list);
  }
  for (const r of reminders) {
    const list = remByTask.get(r.taskId) ?? [];
    list.push(r);
    remByTask.set(r.taskId, list);
  }
  return tasks.map((t) => ({
    ...t,
    submissions: subsByTask.get(t.id) ?? [],
    reminders: remByTask.get(t.id) ?? [],
  }));
}

// --- templates (RF-11) ---------------------------------------------

export async function getTemplates(stageId?: number): Promise<TaskTemplateRow[]> {
  return repo.listTemplates(stageId);
}

// --- leitura de tarefas ------------------------------------------

export async function getTasksForTeam(actor: Actor, teamId: string): Promise<TaskWithDetails[]> {
  await assertCanSeeTeam(actor, teamId);
  return decorate(await repo.listTasksByTeam(teamId));
}

export async function getTasksForStudent(userId: string): Promise<TaskWithTeam[]> {
  const rows = await repo.listTasksForUser(userId);
  const decorated = await decorate(rows);
  return decorated.map((t, i) => ({
    ...t,
    team: { id: rows[i]!.teamId, ideaName: rows[i]!.teamName },
  }));
}

async function loadTaskForActor(actor: Actor, taskId: string, manage: boolean): Promise<TaskRow> {
  const task = await repo.getTask(taskId);
  if (!task) throw new NotFoundError("Tarefa não encontrada.");
  if (manage) await assertCanManageTeam(actor, task.teamId);
  else await assertCanSeeTeam(actor, task.teamId);
  return task;
}

// --- criação/edição (RF-11/12) — staff --------------------------

export interface CreateTaskInput {
  teamId: string;
  stageId: number;
  templateId?: string;
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
}

export async function createTask(actor: Actor, input: CreateTaskInput): Promise<TaskRow> {
  await assertCanManageTeam(actor, input.teamId);

  let templateId: string | null = null;
  if (input.templateId) {
    const tpl = await repo.getTemplate(input.templateId);
    if (!tpl) throw new BadRequestError("Modelo de tarefa não encontrado.");
    templateId = tpl.id;
  }

  const task = await repo.insertTask({
    teamId: input.teamId,
    stageId: input.stageId,
    templateId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    dueDate: input.dueDate,
    createdById: actor.id,
  });

  await recordAuditLog({
    actorUserId: actor.id,
    entityType: "task",
    entityId: task.id,
    action: "TASK_CREATED",
    metadata: { teamId: task.teamId, stageId: task.stageId, fromTemplate: templateId !== null },
  });

  for (const uid of await repo.teamMemberIds(input.teamId)) {
    await recordNotification({
      recipientUserId: uid,
      type: "TASK_ASSIGNED",
      subject: `Nova tarefa: ${task.title}`,
      relatedTeamId: task.teamId,
      relatedTaskId: task.id,
    });
  }
  return task;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  dueDate?: string;
}

export async function updateTask(
  actor: Actor,
  taskId: string,
  patch: UpdateTaskInput,
): Promise<TaskRow> {
  await loadTaskForActor(actor, taskId, true);
  const updated = await repo.updateTask(taskId, {
    title: patch.title?.trim(),
    description: patch.description?.trim(),
    dueDate: patch.dueDate,
  });
  if (!updated) throw new NotFoundError("Tarefa não encontrada.");
  await recordAuditLog({
    actorUserId: actor.id,
    entityType: "task",
    entityId: taskId,
    action: "TASK_UPDATED",
  });
  return updated;
}

// --- entrega (RF-14/16) — aluno da equipe ----------------------

export interface SubmitInput {
  fileUrl: string;
  isExternalLink: boolean;
}

export async function submitTask(
  actor: Actor,
  taskId: string,
  input: SubmitInput,
): Promise<SubmissionRow> {
  const task = await repo.getTask(taskId);
  if (!task) throw new NotFoundError("Tarefa não encontrada.");
  // só integrante da equipe entrega (staff não entrega no lugar do aluno)
  await assertCanSeeTeam(actor, task.teamId);
  if (actor.role !== "STUDENT") {
    throw new ForbiddenError("Somente integrantes da equipe enviam entregas.");
  }

  const { id } = await tx(async (client) => {
    const created = await repo.insertSubmission(client, {
      taskId,
      submittedById: actor.id,
      fileUrl: input.fileUrl,
      isExternalLink: input.isExternalLink,
    });
    await repo.setTaskStatus(client, taskId, "SUBMITTED");
    return created;
  });

  await recordAuditLog({
    actorUserId: actor.id,
    entityType: "task_submission",
    entityId: id,
    action: "SUBMISSION_CREATED",
    metadata: { taskId, isExternalLink: input.isExternalLink },
  });
  for (const uid of await repo.adminIds()) {
    await recordNotification({
      recipientUserId: uid,
      type: "FILE_SUBMITTED",
      subject: `Nova entrega: ${task.title}`,
      relatedTeamId: task.teamId,
      relatedTaskId: taskId,
    });
  }
  return (await repo.getSubmission(id))!;
}

// --- revisão (RF-15) — staff ---------------------------------

export interface ReviewInput {
  decision: "APPROVED" | "REJECTED";
  reviewComment?: string;
}

export async function reviewSubmission(
  actor: Actor,
  submissionId: string,
  input: ReviewInput,
): Promise<SubmissionRow> {
  const sub = await repo.getSubmission(submissionId);
  if (!sub) throw new NotFoundError("Entrega não encontrada.");
  const task = await repo.getTask(sub.taskId);
  if (!task) throw new NotFoundError("Tarefa não encontrada.");
  await assertCanManageTeam(actor, task.teamId);

  await tx(async (client) => {
    await repo.reviewSubmission(client, {
      id: submissionId,
      decision: input.decision,
      comment: input.reviewComment?.trim() || null,
      reviewerId: actor.id,
    });
    await repo.setTaskStatus(client, task.id, input.decision);
  });

  await recordNotification({
    recipientUserId: sub.submittedById,
    type: input.decision === "APPROVED" ? "SUBMISSION_APPROVED" : "SUBMISSION_REJECTED",
    subject:
      input.decision === "APPROVED"
        ? `Entrega aprovada: ${task.title}`
        : `Ajustes solicitados: ${task.title}`,
    relatedTeamId: task.teamId,
    relatedTaskId: task.id,
  });
  await recordAuditLog({
    actorUserId: actor.id,
    entityType: "task_submission",
    entityId: submissionId,
    action: input.decision === "APPROVED" ? "SUBMISSION_APPROVED" : "SUBMISSION_REJECTED",
    metadata: { taskId: task.id },
  });
  return (await repo.getSubmission(submissionId))!;
}

// --- lembretes (RF-17/20) — staff --------------------------

export async function configureReminder(
  actor: Actor,
  taskId: string,
  remindAt: string,
): Promise<ReminderRow> {
  const task = await loadTaskForActor(actor, taskId, true);
  const reminder = await repo.insertReminder({
    taskId,
    remindAt,
    isManual: false,
    sent: false,
  });
  await recordAuditLog({
    actorUserId: actor.id,
    entityType: "task",
    entityId: taskId,
    action: "REMINDER_SCHEDULED",
    metadata: { remindAt, teamId: task.teamId },
  });
  return reminder;
}

/** RF-20 — lembrete manual: cria já marcado como enviado e dispara e-mail. */
export async function sendManualReminder(actor: Actor, taskId: string): Promise<ReminderRow> {
  const task = await loadTaskForActor(actor, taskId, true);
  const reminder = await repo.insertReminder({
    taskId,
    remindAt: new Date().toISOString(),
    isManual: true,
    sent: true,
  });
  for (const uid of await repo.teamMemberIds(task.teamId)) {
    await recordNotification({
      recipientUserId: uid,
      type: "MANUAL_REMINDER",
      subject: `Lembrete: ${task.title}`,
      relatedTeamId: task.teamId,
      relatedTaskId: taskId,
    });
  }
  await recordAuditLog({
    actorUserId: actor.id,
    entityType: "task",
    entityId: taskId,
    action: "REMINDER_SENT_MANUAL",
    metadata: { teamId: task.teamId },
  });
  return reminder;
}
