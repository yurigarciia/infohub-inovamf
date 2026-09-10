import { env } from "../../config/env.js";

/**
 * Envio de e-mail transacional. Interface para trocar a implementação
 * sem tocar em quem dispara (Q7 — decisão: Resend). Nesta fase o
 * ConsoleEmailSender só loga; o registro no banco fica em
 * notifications.service (grava email_notifications de qualquer jeito).
 */
export interface OutgoingEmail {
  to: string;
  subject: string;
  body: string;
}

export interface EmailSender {
  /** Devolve um id do provedor (ou null se falhou/mock). */
  send(email: OutgoingEmail): Promise<string | null>;
}

class ConsoleEmailSender implements EmailSender {
  async send(email: OutgoingEmail): Promise<string | null> {
    console.log(
      `[email] para=${email.to} assunto="${email.subject}"\n        ${email.body}`,
    );
    return `console-${Date.now()}`;
  }
}

// Quando houver RESEND_API_KEY + domínio verificado, plugar aqui um
// ResendEmailSender por trás desta mesma interface.
export const emailSender: EmailSender = new ConsoleEmailSender();

export const EMAIL_FROM = env.EMAIL_FROM;
