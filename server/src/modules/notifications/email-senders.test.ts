import { describe, expect, it, vi } from "vitest";
import {
  MailServiceEmailSender,
  SkipDemoRecipients,
  renderEmailHtml,
  type EmailSender,
} from "./email-senders.js";

const APP = "https://app.exemplo.com";
const mail = { to: "ana@exemplo.com", subject: "Nova tarefa: Canvas", body: "Abra o app." };

const res = (status: number, body: unknown = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function sender(fetchImpl: ReturnType<typeof vi.fn>, cooldownMs = 60_000) {
  return new MailServiceEmailSender({
    baseUrl: "https://mail.exemplo.com/",
    apiKey: "chave-secreta",
    appUrl: APP,
    cooldownMs,
    fetchImpl,
  });
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

  it("400/401: lança e NÃO abre o circuito (repetir não resolve, mas outros envios seguem)", async () => {
    const f = vi.fn().mockResolvedValue(res(401, { message: "Unauthorized" }));
    const s = sender(f);
    await expect(s.send(mail)).rejects.toThrow(/recusou.*401/);
    await expect(s.send(mail)).rejects.toThrow(/recusou.*401/);
    expect(f).toHaveBeenCalledTimes(2); // tentou de novo: circuito fechado
  });

  it("5xx: lança e abre o circuito — a chamada seguinte falha sem tocar na rede", async () => {
    const f = vi.fn().mockResolvedValue(res(503));
    const s = sender(f);
    await expect(s.send(mail)).rejects.toThrow(/erro \(503\)/);
    await expect(s.send(mail)).rejects.toThrow(/indisponível/);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("falha de rede/timeout: lança e abre o circuito", async () => {
    const f = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const s = sender(f);
    await expect(s.send(mail)).rejects.toThrow(/inacessível.*ECONNREFUSED/);
    await expect(s.send(mail)).rejects.toThrow(/indisponível/);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("depois do cooldown volta a tentar", async () => {
    const f = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(res(202, { id: "ok" }));
    const s = sender(f, 0); // sem espera
    await expect(s.send(mail)).rejects.toThrow();
    await new Promise((r) => setTimeout(r, 5));
    await expect(s.send(mail)).resolves.toBe("ok");
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
