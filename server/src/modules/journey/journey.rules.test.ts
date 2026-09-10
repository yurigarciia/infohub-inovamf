import { describe, expect, it } from "vitest";
import { AppError } from "../../shared/errors.js";
import { assertTransitionAllowed } from "./journey.rules.js";

describe("RN-01 — assertTransitionAllowed", () => {
  it("permite avançar uma etapa", () => {
    expect(() => assertTransitionAllowed(1, 2)).not.toThrow();
    expect(() => assertTransitionAllowed(5, 6)).not.toThrow();
  });

  it("permite retroceder uma etapa", () => {
    expect(() => assertTransitionAllowed(3, 2)).not.toThrow();
  });

  it("rejeita pular mais de uma etapa", () => {
    expect(() => assertTransitionAllowed(1, 3)).toThrow(AppError);
    expect(() => assertTransitionAllowed(2, 6)).toThrow(/uma etapa por vez/);
  });

  it("rejeita ficar na mesma etapa", () => {
    expect(() => assertTransitionAllowed(4, 4)).toThrow(/já está nesta etapa/);
  });

  it("rejeita destino fora de 1..6", () => {
    expect(() => assertTransitionAllowed(6, 7)).toThrow(/1 a 6/);
    expect(() => assertTransitionAllowed(1, 0)).toThrow(/1 a 6/);
  });

  it("erro de transição é 400", () => {
    try {
      assertTransitionAllowed(1, 4);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).status).toBe(400);
    }
  });
});
