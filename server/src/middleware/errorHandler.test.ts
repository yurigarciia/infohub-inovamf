import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { BadRequestError } from "../shared/errors.js";
import { errorHandler } from "./errorHandler.js";

function run(err: unknown) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  errorHandler(err, {} as Request, res as unknown as Response, () => undefined);
  return { status: res.status.mock.calls[0]?.[0], body: res.json.mock.calls[0]?.[0] };
}
const pgError = (code: string) => Object.assign(new Error("pg"), { code });

describe("errorHandler — 4xx quando a culpa é da entrada, 500 só para bug", () => {
  it("ZodError -> 400 com campos", () => {
    const parsed = z.object({ a: z.string() }).safeParse({});
    const r = run(parsed.error);
    expect(r.status).toBe(400);
    expect(r.body.error.fields[0].path).toBe("a");
  });
  it("AppError mantém status e código", () => {
    const r = run(new BadRequestError("nope"));
    expect(r.status).toBe(400);
    expect(r.body.error.message).toBe("nope");
  });
  it("JSON malformado (body-parser) -> 400", () => {
    expect(run(Object.assign(new SyntaxError("x"), { type: "entity.parse.failed", status: 400, expose: true })).status).toBe(400);
  });
  it("corpo grande demais (body-parser) -> 413", () => {
    expect(run(Object.assign(new Error("x"), { type: "entity.too.large", status: 413, expose: true })).status).toBe(413);
  });
  it.each([
    ["23503", 400], // FK: área/equipe inexistente
    ["22P02", 400], // uuid/número malformado
    ["22008", 400], // data fora do calendário
    ["23502", 400], // NOT NULL
    ["23505", 409], // unique
  ])("Postgres %s -> %i", (code, status) => {
    expect(run(pgError(code)).status).toBe(status);
  });
  it("erro desconhecido -> 500 sem vazar detalhe de banco", () => {
    const r = run(new Error("segredo interno"));
    expect(r.status).toBe(500);
    expect(r.body.error.code).toBe("INTERNAL");
  });
  it("código de erro de banco não mapeado continua 500", () => {
    expect(run(pgError("XX000")).status).toBe(500);
  });
});
