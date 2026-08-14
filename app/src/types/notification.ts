// Espelha o model EmailNotification de app/prisma/schema.prisma.

import type { EmailNotificationStatus, EmailNotificationType } from "./enums";

/** Log de e-mails disparados via Resend (Q7) — RF-18, RF-19, RNF-05/06. */
export interface EmailNotification {
  id: string;
  recipientUserId: string;
  type: EmailNotificationType;
  subject: string;
  relatedTeamId: string | null;
  relatedTaskId: string | null;
  status: EmailNotificationStatus;
  providerMessageId: string | null;
  sentAt: Date | null;
  createdAt: Date;
}
