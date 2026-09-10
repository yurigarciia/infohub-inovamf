// Camada de acesso ao log de notificações por e-mail (RF-18, RF-19).
// O disparo de fato e a gravação acontecem no backend (ConsoleEmailSender
// nesta fase; Resend depois — Q7); aqui só lemos o histórico.

import { apiFetch } from "@/lib/api-client";
import type { EmailNotification } from "@/types";

interface RawEmailNotification {
  id: string;
  recipientUserId: string;
  type: EmailNotification["type"];
  subject: string;
  relatedTeamId: string | null;
  relatedTaskId: string | null;
  status: EmailNotification["status"];
  providerMessageId: string | null;
  sentAt: string | null;
  createdAt: string;
}

/** Histórico de e-mails do usuário autenticado (o backend usa o token;
 * o parâmetro fica só pela compatibilidade das telas). */
export async function getNotificationsForUser(_userId?: string): Promise<EmailNotification[]> {
  void _userId;
  const rows = await apiFetch<RawEmailNotification[]>("/notifications/mine");
  return rows.map((n) => ({
    ...n,
    sentAt: n.sentAt ? new Date(n.sentAt) : null,
    createdAt: new Date(n.createdAt),
  }));
}
