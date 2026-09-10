import { query } from "../../shared/sql.js";

export interface EmailNotificationRow {
  id: string;
  recipientUserId: string;
  type: string;
  subject: string;
  relatedTeamId: string | null;
  relatedTaskId: string | null;
  status: string;
  providerMessageId: string | null;
  sentAt: string | null;
  createdAt: string;
}

/** Log de e-mails de um destinatário (RF-18/19), mais recentes primeiro. */
export async function listForUser(userId: string, limit: number): Promise<EmailNotificationRow[]> {
  return query<EmailNotificationRow>(
    `SELECT id,
            recipient_user_id   AS "recipientUserId",
            type,
            subject,
            related_team_id     AS "relatedTeamId",
            related_task_id     AS "relatedTaskId",
            status,
            provider_message_id AS "providerMessageId",
            sent_at             AS "sentAt",
            created_at          AS "createdAt"
       FROM email_notifications
      WHERE recipient_user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [userId, limit],
  );
}
