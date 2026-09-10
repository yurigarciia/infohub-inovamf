import { describe, expect, it } from "vitest";
import { isReminderDue, isTaskOverdue } from "./rules.js";

const NOW = new Date("2026-09-10T12:00:00.000Z");

describe("RN-04 — isTaskOverdue", () => {
  it("marca PENDING com prazo passado", () => {
    expect(isTaskOverdue({ status: "PENDING", dueDate: "2026-09-09" }, NOW)).toBe(true);
  });

  it("marca IN_PROGRESS com prazo passado", () => {
    expect(isTaskOverdue({ status: "IN_PROGRESS", dueDate: "2026-09-01" }, NOW)).toBe(true);
  });

  it("não marca quando o prazo é hoje", () => {
    expect(isTaskOverdue({ status: "PENDING", dueDate: "2026-09-10" }, NOW)).toBe(false);
  });

  it("não marca quando o prazo é futuro", () => {
    expect(isTaskOverdue({ status: "PENDING", dueDate: "2026-12-01" }, NOW)).toBe(false);
  });

  it("ignora tarefas que não estão em aberto", () => {
    for (const status of ["SUBMITTED", "APPROVED", "REJECTED", "LATE"]) {
      expect(isTaskOverdue({ status, dueDate: "2026-01-01" }, NOW)).toBe(false);
    }
  });
});

describe("RF-17 — isReminderDue", () => {
  it("devido quando remind_at <= agora e não enviado", () => {
    expect(isReminderDue({ sent: false, remindAt: "2026-09-10T11:59:00.000Z" }, NOW)).toBe(true);
    expect(isReminderDue({ sent: false, remindAt: NOW }, NOW)).toBe(true);
  });

  it("não devido no futuro", () => {
    expect(isReminderDue({ sent: false, remindAt: "2026-09-11T00:00:00.000Z" }, NOW)).toBe(false);
  });

  it("nunca reenvia o que já foi enviado", () => {
    expect(isReminderDue({ sent: true, remindAt: "2026-01-01T00:00:00.000Z" }, NOW)).toBe(false);
  });
});
