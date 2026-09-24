/**
 * Implementações de envio de e-mail (sem depender de env — a configuração
 * é injetada em notifications.adapter.ts, o que deixa tudo testável).
 */
export interface OutgoingEmail {
  to: string;
  subject: string;
  /** Texto simples; vira HTML no envio (ver renderEmailHtml). */
  body: string;
}

export interface EmailSender {
  /** Devolve o id do envio no provedor (ou null). Lança se falhou. */
  send(email: OutgoingEmail): Promise<string | null>;
}

// --- HTML ----------------------------------------------------------------

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Escapa, transforma URLs em links e quebras de linha em <br>. */
function textToHtml(text: string): string {
  return escapeHtml(text)
    .replace(/https?:\/\/[^\s<]+/g, (raw) => {
      // não engole pontuação final da frase
      const url = raw.replace(/[.,;:!?)]+$/, "");
      const tail = raw.slice(url.length);
      return `<a href="${url}" style="color:#c4161c">${url}</a>${tail}`;
    })
    .replace(/\r?\n/g, "<br>");
}

/** Layout único dos e-mails transacionais. O mail-service espera `body` em HTML. */
export function renderEmailHtml(
  email: Pick<OutgoingEmail, "subject" | "body">,
  appUrl: string,
): string {
  const showBody = email.body.trim() !== "" && email.body.trim() !== email.subject.trim();
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(email.subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden">
<tr><td style="background:#7f1d1d;background-image:linear-gradient(90deg,#5b0f1e,#e8501e);padding:16px 24px;color:#ffffff;font-size:18px;font-weight:bold">InfoHub &middot; InovAMF</td></tr>
<tr><td style="padding:24px">
<h2 style="margin:0 0 12px;font-size:18px;color:#111827">${escapeHtml(email.subject)}</h2>
${showBody ? `<div style="font-size:15px;line-height:1.55">${textToHtml(email.body)}</div>` : ""}
<p style="margin:24px 0 0"><a href="${escapeHtml(appUrl)}" style="display:inline-block;background:#c4161c;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:14px">Abrir o InfoHub</a></p>
</td></tr>
<tr><td style="padding:12px 24px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb">Mensagem autom&aacute;tica do InfoHub &mdash; n&atilde;o responda este e-mail.</td></tr>
</table></td></tr></table>
</body></html>`;
}

// --- senders -----------------------------------------------------------

/** Só loga (dev / sem MAIL_API_KEY). O registro em email_notifications é do service. */
export class ConsoleEmailSender implements EmailSender {
  async send(email: OutgoingEmail): Promise<string | null> {
    console.log(`[email] para=${email.to} assunto="${email.subject}"\n        ${email.body}`);
    return `console-${Date.now()}`;
  }
}

/** Falha de envio, dizendo se vale tentar de novo (rede/timeout/5xx) ou não (400/401). */
export class EmailSendError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "EmailSendError";
  }
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface MailServiceOptions {
  baseUrl: string;
  apiKey: string;
  appUrl: string;
  /**
   * Timeout POR TENTATIVA. Generoso de propósito: o mail-service roda num
   * host que hiberna (cold start de dezenas de segundos) — o envio corre em
   * segundo plano, então esperar é barato; abortar cedo perderia o e-mail.
   */
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}

/**
 * Cliente do mail-service (POST /emails, header x-api-key). A API é
 * fire-and-forget: 202 = aceito e enfileirado (ela mesma refaz até 3x).
 * Erros de rede/timeout/5xx/408/429 são `retryable`; os demais 4xx (payload
 * ou chave inválidos) não — repetir não resolve.
 */
export class MailServiceEmailSender implements EmailSender {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(private readonly opts: MailServiceOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = opts.fetchImpl ?? ((url, init) => fetch(url, init));
  }

  async send(email: OutgoingEmail): Promise<string | null> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}/emails`, {
        method: "POST",
        headers: { "x-api-key": this.opts.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          to: [email.to],
          subject: email.subject,
          body: renderEmailHtml(email, this.opts.appUrl),
        }),
        signal: AbortSignal.timeout(this.opts.timeoutMs ?? 45_000),
      });
    } catch (err) {
      throw new EmailSendError(
        `mail-service inacessível: ${err instanceof Error ? err.message : String(err)}`,
        true,
      );
    }

    if (res.status >= 500 || res.status === 408 || res.status === 429) {
      throw new EmailSendError(`mail-service indisponível (${res.status})`, true);
    }
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 200);
      throw new EmailSendError(`mail-service recusou o envio (${res.status}): ${detail}`, false);
    }

    const data = (await res.json().catch(() => null)) as { id?: string } | null;
    return data?.id ?? null;
  }
}

export interface RetryOptions {
  /** Espera antes de cada nova tentativa; o nº de tentativas é length + 1. */
  delaysMs?: readonly number[];
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Tenta de novo (com espera crescente) as falhas `retryable`. Com os
 * padrões: 4 tentativas em ~1 min + o timeout de cada uma — cobre um cold
 * start do mail-service. Falha não-retryable (ou qualquer erro que não seja
 * EmailSendError) sobe na hora.
 */
export class RetryingEmailSender implements EmailSender {
  private readonly delays: readonly number[];
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly inner: EmailSender,
    opts: RetryOptions = {},
  ) {
    this.delays = opts.delaysMs ?? [4_000, 15_000, 45_000];
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  async send(email: OutgoingEmail): Promise<string | null> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.inner.send(email);
      } catch (err) {
        const retryable = err instanceof EmailSendError && err.retryable;
        if (!retryable || attempt >= this.delays.length) throw err;
        console.warn(
          `[email] tentativa ${attempt + 1} falhou (${(err as Error).message}); nova em ${this.delays[attempt]! / 1000}s`,
        );
        await this.sleep(this.delays[attempt]!);
      }
    }
  }
}

/**
 * Trava de segurança: NÃO manda e-mail real para contas de demonstração
 * (os e-mails do seed são fictícios, em domínios que podem existir de
 * verdade). Para esses destinatários só loga e devolve um id `demo-skip-…`.
 */
export class SkipDemoRecipients implements EmailSender {
  private readonly skip: Set<string>;

  constructor(
    private readonly inner: EmailSender,
    skipDomains: readonly string[],
  ) {
    this.skip = new Set(skipDomains.map((d) => d.trim().toLowerCase()).filter(Boolean));
  }

  async send(email: OutgoingEmail): Promise<string | null> {
    const domain = email.to.split("@").pop()?.toLowerCase() ?? "";
    if (this.skip.has(domain)) {
      console.log(`[email:demo-skip] para=${email.to} assunto="${email.subject}" (domínio de demonstração, não enviado)`);
      return `demo-skip-${Date.now()}`;
    }
    return this.inner.send(email);
  }
}
