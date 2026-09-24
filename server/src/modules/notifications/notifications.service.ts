import { maybeOne, query } from "../../shared/sql.js";
import { recordAuditLog } from "../audit/audit.service.js";
import { emailSender } from "./notifications.adapter.js";
import * as repo from "./notifications.repository.js";
import type { EmailNotificationRow } from "./notifications.repository.js";

/**
 * Registra (e "envia") um e-mail transacional — RF-18, RF-19. Chamado
 * pelos outros módulos quando uma ação de negócio dispara e-mail
 * (nova tarefa, aprovação, novo cadastro, etc.). Grava uma linha em
 * email_notifications + uma entrada de auditoria (quando a entrega termina).
 */
export type EmailNotificationType =
  | "TASK_ASSIGNED"
  | "DEADLINE_REMINDER"
  | "DEADLINE_LATE"
  | "SUBMISSION_APPROVED"
  | "SUBMISSION_REJECTED"
  | "NEW_TEAM_REGISTERED"
  | "FILE_SUBMITTED"
  | "TASK_LATE"
  | "MANUAL_REMINDER";

export interface RecordNotificationInput {
  recipientUserId: string;
  type: EmailNotificationType;
  subject: string;
  body?: string;
  relatedTeamId?: string | null;
  relatedTaskId?: string | null;
}

// Entregas em andamento (envio em segundo plano — ver recordNotification).
const inFlight = new Set<Promise<void>>();

/** Espera (até `timeoutMs`) as entregas pendentes — usado no shutdown para
 * não perder e-mail que ainda está em retentativa. Devolve quantas havia. */
export async function flushPendingEmails(timeoutMs = 10_000): Promise<number> {
  const pending = inFlight.size;
  if (pending === 0) return 0;
  await Promise.race([
    Promise.allSettled([...inFlight]),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
  return pending;
}

/**
 * Dispara o e-mail e devolve NA HORA (só resolve o endereço do destinatário
 * no banco). O envio em si corre em segundo plano: o mail-service pode estar
 * em cold start (dezenas de segundos) e não deve segurar a request do
 * usuário. A linha em email_notifications e a auditoria são gravadas quando
 * a entrega termina — SENT ("aceito e enfileirado" pelo mail-service) ou
 * FAILED depois de esgotadas as retentativas.
 * Trade-off: um envio ainda em andamento se perde se o processo cair.
 */
export async function recordNotification(input: RecordNotificationInput): Promise<void> {
  const recipient = await maybeOne<{ email: string }>(
    "SELECT email FROM users WHERE id = $1",
    [input.recipientUserId],
  );
  const job = deliver(input, recipient?.email ?? "(desconhecido)");
  inFlight.add(job);
  void job.finally(() => inFlight.delete(job));
}

/** Nunca rejeita: qualquer falha vira log (e status FAILED quando é do envio). */
async function deliver(input: RecordNotificationInput, to: string): Promise<void> {
  let providerId: string | null = null;
  let status: "SENT" | "FAILED" = "SENT";
  try {
    providerId = await emailSender.send({
      to,
      subject: input.subject,
      body: input.body ?? input.subject,
    });
  } catch (err) {
    status = "FAILED";
    console.error(`[email] falha definitiva para ${to}: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const rows = await query<{ id: string }>(
      `INSERT INTO email_notifications
         (recipient_user_id, type, subject, related_team_id, related_task_id, status, provider_message_id, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        input.recipientUserId,
        input.type,
        input.subject,
        input.relatedTeamId ?? null,
        input.relatedTaskId ?? null,
        status,
        providerId,
        status === "SENT" ? new Date() : null,
      ],
    );

    await recordAuditLog({
      actorUserId: null, // e-mail é disparado pelo sistema
      entityType: "email_notification",
      entityId: rows[0]!.id,
      action: "EMAIL_SENT",
      metadata: { type: input.type, recipientUserId: input.recipientUserId, status },
    });
  } catch (err) {
    console.error("[email] não consegui registrar a notificação:", err instanceof Error ? err.message : err);
  }
}

/** RF-18/19 — histórico de e-mails do usuário autenticado. */
export async function getNotificationsForUser(
  userId: string,
  limit = 100,
): Promise<EmailNotificationRow[]> {
  return repo.listForUser(userId, Math.min(Math.max(limit, 1), 300));
}
