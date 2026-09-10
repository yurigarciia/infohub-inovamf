/**
 * Regras puras dos jobs agendados (B7) — isoladas para teste unitário
 * (B8). O scheduler abaixo só orquestra; a decisão mora aqui.
 */

/** Status que ainda "correm contra o prazo" — os demais (entregue,
 * aprovado, já atrasado) não são reavaliados. */
const OPEN_STATUSES = new Set(["PENDING", "IN_PROGRESS"]);

/** RN-04 — tarefa em aberto cujo prazo já passou vira LATE. Compara só
 * a data (due_date é DATE), não a hora. */
export function isTaskOverdue(
  task: { status: string; dueDate: string | Date },
  now: Date,
): boolean {
  if (!OPEN_STATUSES.has(task.status)) return false;
  const due = typeof task.dueDate === "string" ? new Date(task.dueDate) : task.dueDate;
  const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return dueDay < today;
}

/** RF-17 — lembrete "devido": ainda não enviado e com a data no passado. */
export function isReminderDue(
  reminder: { sent: boolean; remindAt: string | Date },
  now: Date,
): boolean {
  if (reminder.sent) return false;
  const at = typeof reminder.remindAt === "string" ? new Date(reminder.remindAt) : reminder.remindAt;
  return at.getTime() <= now.getTime();
}
