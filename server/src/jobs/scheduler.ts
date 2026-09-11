import { query } from "../shared/sql.js";
import { recordAuditLog } from "../modules/audit/audit.service.js";
import { recordNotification } from "../modules/notifications/notifications.service.js";

/**
 * Jobs agendados (B7). Roda no próprio processo do servidor por
 * simplicidade — é um bom candidato a worker separado no futuro (nota
 * no README). Duas tarefas periódicas:
 *   (a) RN-04  — marca tarefas vencidas sem entrega como LATE;
 *   (b) RF-17  — dispara lembretes cuja data já chegou.
 * A lógica de "está vencida" / "está devido" vive em jobs/rules.ts
 * (testável); aqui o filtro é feito direto em SQL.
 */

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 min

/** (a) RN-04 — tarefas PENDING/IN_PROGRESS com prazo passado viram LATE. */
export async function markOverdueTasks(): Promise<number> {
  const rows = await query<{ id: string; team_id: string }>(
    `UPDATE tasks
        SET status = 'LATE', updated_at = now()
      WHERE status IN ('PENDING', 'IN_PROGRESS')
        AND due_date < CURRENT_DATE
        AND deleted_at IS NULL
      RETURNING id, team_id`,
  );
  for (const row of rows) {
    await recordAuditLog({
      actorUserId: null,
      entityType: "task",
      entityId: row.id,
      action: "TASK_MARKED_LATE",
      metadata: { teamId: row.team_id },
    });
  }
  return rows.length;
}

/** (b) RF-17 — lembretes com remind_at <= now e ainda não enviados. */
export async function dispatchDueReminders(): Promise<number> {
  const due = await query<{
    id: string;
    task_id: string;
    team_id: string;
    title: string;
  }>(
    `SELECT r.id, r.task_id, t.team_id, t.title
       FROM task_reminders r
       JOIN tasks t ON t.id = r.task_id
      WHERE r.sent = false AND r.remind_at <= now()
        AND r.deleted_at IS NULL AND t.deleted_at IS NULL`,
  );

  for (const r of due) {
    const members = await query<{ user_id: string }>(
      `SELECT user_id FROM team_members WHERE team_id = $1 AND deleted_at IS NULL`,
      [r.team_id],
    );
    for (const m of members) {
      await recordNotification({
        recipientUserId: m.user_id,
        type: "DEADLINE_REMINDER",
        subject: `Lembrete de prazo: ${r.title}`,
        relatedTeamId: r.team_id,
        relatedTaskId: r.task_id,
      });
    }
    await query(`UPDATE task_reminders SET sent = true, sent_at = now() WHERE id = $1`, [r.id]);
  }
  return due.length;
}

export async function runJobsOnce(): Promise<{ late: number; reminders: number }> {
  const [late, reminders] = [await markOverdueTasks(), await dispatchDueReminders()];
  return { late, reminders };
}

let timer: NodeJS.Timeout | null = null;

/** Liga o loop periódico. Chamado do index.ts (não nos testes). */
export function startScheduler(intervalMs = DEFAULT_INTERVAL_MS): void {
  if (timer) return;
  const tick = () => {
    runJobsOnce()
      .then(({ late, reminders }) => {
        if (late || reminders) {
          console.log(`[jobs] ${late} tarefa(s) -> LATE, ${reminders} lembrete(s) enviados`);
        }
      })
      .catch((err) => console.error("[jobs] erro no ciclo:", err));
  };
  tick(); // roda uma vez ao subir
  timer = setInterval(tick, intervalMs);
  timer.unref?.(); // não segura o processo aberto sozinho
}

export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
