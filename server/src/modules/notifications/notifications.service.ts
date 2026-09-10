import { maybeOne, query } from "../../shared/sql.js";
import { recordAuditLog } from "../audit/audit.service.js";
import { emailSender } from "./notifications.adapter.js";

/**
 * Registra (e "envia") um e-mail transacional — RF-18, RF-19. Chamado
 * pelos outros módulos quando uma ação de negócio dispara e-mail
 * (nova tarefa, aprovação, novo cadastro, etc.). Grava sempre uma linha
 * em email_notifications + uma entrada de auditoria.
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

export async function recordNotification(input: RecordNotificationInput): Promise<void> {
  const recipient = await maybeOne<{ email: string }>(
    "SELECT email FROM users WHERE id = $1",
    [input.recipientUserId],
  );

  let providerId: string | null = null;
  let status: "SENT" | "FAILED" = "SENT";
  try {
    providerId = await emailSender.send({
      to: recipient?.email ?? "(desconhecido)",
      subject: input.subject,
      body: input.body ?? input.subject,
    });
  } catch {
    status = "FAILED";
  }

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
}
