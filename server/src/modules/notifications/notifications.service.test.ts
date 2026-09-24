import { beforeEach, describe, expect, it, vi } from "vitest";

// Sem banco, sem rede: só a orquestração do recordNotification.
const sql = vi.hoisted(() => ({
  maybeOne: vi.fn(),
  query: vi.fn(),
}));
const audit = vi.hoisted(() => ({ recordAuditLog: vi.fn() }));
const sender = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("../../shared/sql.js", () => sql);
vi.mock("../audit/audit.service.js", () => audit);
vi.mock("./notifications.adapter.js", () => ({ emailSender: sender }));
vi.mock("./notifications.repository.js", () => ({}));

const { recordNotification, flushPendingEmails } = await import("./notifications.service.js");

const input = {
  recipientUserId: "user-1",
  type: "TASK_ASSIGNED" as const,
  subject: "Nova tarefa: Canvas",
  relatedTaskId: "task-1",
};

/** Promise que o teste resolve/rejeita quando quiser (simula o mail-service lento). */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

const insertedStatus = () => sql.query.mock.calls[0]?.[1]?.[5];

beforeEach(() => {
  vi.clearAllMocks();
  sql.maybeOne.mockResolvedValue({ email: "ana@exemplo.com" });
  sql.query.mockResolvedValue([{ id: "notif-1" }]);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("recordNotification (envio em segundo plano)", () => {
  it("devolve na hora, sem esperar o mail-service (cold start não trava a request)", async () => {
    const slow = deferred<string>();
    sender.send.mockReturnValue(slow.promise);

    await recordNotification(input); // resolve mesmo com o envio pendurado

    expect(sender.send).toHaveBeenCalledWith({ to: "ana@exemplo.com", subject: input.subject, body: input.subject });
    expect(sql.query).not.toHaveBeenCalled(); // ainda não gravou: a entrega não terminou

    slow.resolve("id-42");
    await flushPendingEmails();
    expect(insertedStatus()).toBe("SENT");
    expect(sql.query.mock.calls[0]![1][6]).toBe("id-42"); // provider_message_id
    expect(audit.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "EMAIL_SENT", entityId: "notif-1", metadata: expect.objectContaining({ status: "SENT" }) }),
    );
  });

  it("grava FAILED quando o envio esgota as tentativas — e não derruba ninguém", async () => {
    sender.send.mockRejectedValue(new Error("mail-service indisponível (503)"));

    await expect(recordNotification(input)).resolves.toBeUndefined();
    await flushPendingEmails();

    expect(insertedStatus()).toBe("FAILED");
    expect(sql.query.mock.calls[0]![1][7]).toBeNull(); // sent_at
    expect(console.error).toHaveBeenCalled();
  });

  it("falha ao gravar no banco vira log, não exceção não tratada", async () => {
    sender.send.mockResolvedValue("id-1");
    sql.query.mockRejectedValue(new Error("banco fora"));

    await recordNotification(input);
    await expect(flushPendingEmails()).resolves.toBe(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("não consegui registrar"), "banco fora");
  });

  it("flushPendingEmails espera as entregas em andamento (shutdown) e respeita o teto de tempo", async () => {
    const slow = deferred<string>();
    sender.send.mockReturnValue(slow.promise);
    await recordNotification(input);

    const t0 = Date.now();
    await expect(flushPendingEmails(60)).resolves.toBe(1); // teto de 60 ms: envio ainda pendente
    expect(Date.now() - t0).toBeLessThan(500);

    slow.resolve("late");
    await flushPendingEmails();
    await expect(flushPendingEmails()).resolves.toBe(0); // nada mais pendente
  });
});
