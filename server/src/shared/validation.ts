import { z } from "zod";

/** AAAA-MM-DD que seja uma data REAL do calendário (rejeita 2030-13-45, 2030-02-31). */
export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD.")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Data inexistente no calendário.");

/** Só http(s): o link é renderizado como <a href> — `javascript:`/`data:` seriam XSS. */
export const httpUrl = z
  .string()
  .trim()
  .url("Informe uma URL válida.")
  .refine((u) => /^https?:\/\//i.test(u), "O link precisa começar com http:// ou https://.");

/** ?limit= — inteiro 1..500 (opcional). */
export const limitQuery = z.coerce.number().int().min(1).max(500).optional();

/** Texto obrigatório que não pode ser só espaços. */
export const requiredText = (max = 5000) => z.string().trim().min(1, "Campo obrigatório.").max(max);
