import { env } from "../../config/env.js";
import {
  ConsoleEmailSender,
  MailServiceEmailSender,
  SkipDemoRecipients,
  type EmailSender,
} from "./email-senders.js";

export type { EmailSender, OutgoingEmail } from "./email-senders.js";

/**
 * Escolhe o envio de e-mail pela configuração:
 *  - MAIL_API_KEY definida -> mail-service (com a trava de contas de demo);
 *  - senão                 -> só loga no console (dev).
 * O registro em email_notifications é feito por notifications.service
 * de qualquer jeito.
 */
function createEmailSender(): EmailSender {
  if (!env.MAIL_API_KEY) return new ConsoleEmailSender();
  return new SkipDemoRecipients(
    new MailServiceEmailSender({
      baseUrl: env.MAIL_API_URL,
      apiKey: env.MAIL_API_KEY,
      appUrl: env.APP_URL,
    }),
    env.MAIL_SKIP_DOMAINS.split(","),
  );
}

export const emailSender: EmailSender = createEmailSender();
