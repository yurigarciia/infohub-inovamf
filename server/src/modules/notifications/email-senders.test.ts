import { describe, expect, it, vi } from "vitest";
import {
  EmailSendError,
  MailServiceEmailSender,
  RetryingEmailSender,
  SkipDemoRecipients,
  renderEmailHtml,
  type EmailSender,
} from "./email-senders.js";

const APP = "https://app.exemplo.com";
const mail = { to: "ana@exemplo.com", subject: "Nova tarefa: Canvas", body: "Abra o app." };

const res = (status: number, body: unknown = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function sender(fetchImpl: ReturnType<typeof vi.fn>) {
  return new MailServiceEmailSender({
    baseUrl: "https://mail.exemplo.com/",
    apiKey: "chave-secreta",
    appUrl: APP,
    fetchImpl,
  });
}

/** Captura o erro (ou falha o teste se não houve). */
async function errorOf(p: Promise<unknown>): Promise<EmailSendError> {
  try {
    await p;
  } catch (e) {
    return e as EmailSendError;
  }
  throw new Error("esperava que o envio falhasse");
}

describe("MailServiceEmailSender", () => {
  it("faz POST /emails com x-api-key e devolve o id do envio", async () => {
    const f = vi.fn().mockResolvedValue(res(202, { id: "abc-123", status: "queued" }));
    const id = await sender(f).send(mail);

    expect(id).toBe("abc-123");
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe("https://mail.exemplo.com/emails"); // barra final da base removida
    expect(init.method).toBe("POST");
    expect(init.headers["x-api-key"]).toBe("chave-secreta");
    const payload = JSON.parse(init.body);
    expect(payload.to).toEqual(["ana@exemplo.com"]);
    expect(payload.subject).toBe("Nova tarefa: Canvas");
    expect(payload.body).toContain("<html"); // o serviço espera HTML
    expect(payload.body).toContain("Abra o app.");
  });

  it.each([400, 401, 403])("%i: erro NÃO retryable (repetir não resolve)", async (status) => {
    const err = await errorOf(sender(vi.fn().mockResolvedValue(res(status, { message: "x" }))).send(mail));
    expect(err).toBeInstanceOf(EmailSendError);
    expect(err.retryable).toBe(false);
    expect(err.message).toContain(String(status));
  });

  it.each([408, 429, 500, 502, 503])("%i: erro retryable (serviço acordando/sobrecarregado)", async (status) => {
    const err = await errorOf(sender(vi.fn().mockResolvedValue(res(status))).send(mail));
    expect(err.retryable).toBe(true);
  });

  it("falha de rede / timeout: retryable", async () => {
    const err = await errorOf(sender(vi.fn().mockRejectedValue(new Error("ECONNRESET"))).send(mail));
    expect(err.retryable).toBe(true);
    expect(err.message).toContain("ECONNRESET");
  });

  it("timeout por tentativa é longo (cold start), não os 5 s de antes", async () => {
    const f = vi.fn().mockResolvedValue(res(202, { id: "x" }));
    await sender(f).send(mail);
    // AbortSignal.timeout(45000): sem como ler o valor, garante ao menos que há um signal
    expect(f.mock.calls[0]![1].signal).toBeInstanceOf(AbortSignal);
  });
});

describe("RetryingEmailSender (cold start do mail-service)", () => {
  const noWait = () => vi.fn().mockResolvedValue(undefined);

  it("sobrevive a um cold start: 503, 503 e depois aceita", async () => {
    const f = vi.fn().mockResolvedValueOnce(res(503)).mockResolvedValueOnce(res(502)).mockResolvedValue(res(202, { id: "ok-1" }));
    const sleep = noWait();
    const r = new RetryingEmailSender(sender(f), { delaysMs: [10, 20, 30], sleep });

    await expect(r.send(mail)).resolves.toBe("ok-1");
    expect(f).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([10, 20]); // backoff crescente
  });

  it("também recupera de timeout/queda de rede na 1ª tentativa", async () => {
    const f = vi.fn().mockRejectedValueOnce(new Error("timeout")).mockResolvedValue(res(202, { id: "ok-2" }));
    const r = new RetryingEmailSender(sender(f), { delaysMs: [1], sleep: noWait() });
    await expect(r.send(mail)).resolves.toBe("ok-2");
  });

  it("erro 401 NÃO é repetido", async () => {
    const f = vi.fn().mockResolvedValue(res(401));
    const sleep = noWait();
    const err = await errorOf(new RetryingEmailSender(sender(f), { delaysMs: [1, 2], sleep }).send(mail));
    expect(err.retryable).toBe(false);
    expect(f).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("esgota as tentativas (delays + 1) e lança o último erro", async () => {
    const f = vi.fn().mockResolvedValue(res(503));
    const err = await errorOf(new RetryingEmailSender(sender(f), { delaysMs: [1, 2, 3], sleep: noWait() }).send(mail));
    expect(err.retryable).toBe(true);
    expect(f).toHaveBeenCalledTimes(4);
  });

  it("erro que não é EmailSendError sobe sem repetir", async () => {
    const inner: EmailSender = { send: vi.fn().mockRejectedValue(new TypeError("bug")) };
    await expect(new RetryingEmailSender(inner, { delaysMs: [1], sleep: noWait() }).send(mail)).rejects.toThrow("bug");
    expect(inner.send).toHaveBeenCalledTimes(1);
  });

  it("padrões: 3 esperas (4 tentativas) — cobre ~1 min de cold start", async () => {
    const inner: EmailSender = { send: vi.fn().mockRejectedValue(new EmailSendError("x", true)) };
    const sleep = noWait();
    await new RetryingEmailSender(inner, { sleep }).send(mail).catch(() => undefined);
    expect(inner.send).toHaveBeenCalledTimes(4);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([4_000, 15_000, 45_000]);
  });
});

describe("SkipDemoRecipients", () => {
  const inner: EmailSender = { send: vi.fn().mockResolvedValue("real-id") };
  const guard = new SkipDemoRecipients(inner, ["acad.amf.br", " Infohub.amf.br "]);

  it("não envia para domínios de demonstração (ignora caixa e espaços)", async () => {
    const id = await guard.send({ ...mail, to: "joao.alves@ACAD.amf.br" });
    expect(id).toMatch(/^demo-skip-/);
    await guard.send({ ...mail, to: "ana.souza@infohub.amf.br" });
    expect(inner.send).not.toHaveBeenCalled();
  });

  it("envia normalmente para os demais", async () => {
    await expect(guard.send(mail)).resolves.toBe("real-id");
    expect(inner.send).toHaveBeenCalledTimes(1);
  });

  it("lista vazia não bloqueia ninguém", async () => {
    const open = new SkipDemoRecipients(inner, [""]);
    await open.send({ ...mail, to: "x@acad.amf.br" });
    expect(inner.send).toHaveBeenCalledTimes(2);
  });
});

describe("renderEmailHtml", () => {
  it("escapa HTML do conteúdo (sem injeção)", () => {
    const html = renderEmailHtml({ subject: "<b>oi</b>", body: '<script>alert("x")</script>' }, APP);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;b&gt;oi&lt;/b&gt;");
  });

  it("vira link e não engole a pontuação final", () => {
    const html = renderEmailHtml({ subject: "s", body: "Acesse https://app.exemplo.com/definir-senha?token=abc123." }, APP);
    expect(html).toContain('<a href="https://app.exemplo.com/definir-senha?token=abc123"');
    expect(html).toContain("</a>.");
  });

  it("quebra de linha vira <br> e o botão aponta pro app", () => {
    const html = renderEmailHtml({ subject: "s", body: "linha 1\nlinha 2" }, APP);
    expect(html).toContain("linha 1<br>linha 2");
    expect(html).toContain(`href="${APP}"`);
  });

  it("corpo igual ao assunto não é repetido", () => {
    const html = renderEmailHtml({ subject: "Entrega aprovada", body: "Entrega aprovada" }, APP);
    expect(html.match(/Entrega aprovada/g)?.length).toBe(2); // <title> + <h2>
  });
});
