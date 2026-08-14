// Camada de acesso ao log de notificações por e-mail (RF-18, RF-19).
// recordNotification() é chamada internamente por outros services quando
// uma ação de negócio dispara e-mail (ex.: aprovar tarefa) — no backend
// real isso vira o disparo de fato via Resend (Q7); aqui só registra.

import { MOCK_EMAIL_NOTIFICATIONS } from "@/mocks/data";
import { generateId } from "@/mocks/utils";
import { EmailNotificationStatus } from "@/types";
import type { EmailNotification, EmailNotificationType } from "@/types";
import { delay } from "./latency";

export async function getNotificationsForUser(userId: string): Promise<EmailNotification[]> {
  await delay();
  return MOCK_EMAIL_NOTIFICATIONS.filter((n) => n.recipientUserId === userId).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export interface RecordNotificationInput {
  recipientUserId: string;
  type: EmailNotificationType;
  subject: string;
  relatedTeamId?: string;
  relatedTaskId?: string;
}

/** Registra o disparo (mock) de um e-mail — chamada por outros services,
 * não diretamente por telas. */
export async function recordNotification(
  input: RecordNotificationInput,
): Promise<EmailNotification> {
  await delay(80);
  const now = new Date();
  const notification: EmailNotification = {
    id: generateId("email"),
    recipientUserId: input.recipientUserId,
    type: input.type,
    subject: input.subject,
    relatedTeamId: input.relatedTeamId ?? null,
    relatedTaskId: input.relatedTaskId ?? null,
    status: EmailNotificationStatus.SENT,
    providerMessageId: generateId("resend-mock"),
    sentAt: now,
    createdAt: now,
  };
  MOCK_EMAIL_NOTIFICATIONS.push(notification);
  return notification;
}
