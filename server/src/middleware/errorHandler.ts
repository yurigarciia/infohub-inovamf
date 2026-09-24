import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { AppError } from "../shared/errors.js";
import { isProd } from "../config/env.js";

/** 404 para rota não registrada. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Rota não encontrada." } });
}

/** Erros do body-parser / http-errors (JSON malformado, corpo grande...). */
function httpErrorOf(err: unknown): { status: number; code: string; message: string } | null {
  if (typeof err !== "object" || err === null) return null;
  const e = err as { type?: string; status?: number; statusCode?: number; expose?: boolean };
  if (e.type === "entity.parse.failed") {
    return { status: 400, code: "BAD_JSON", message: "Corpo da requisição não é um JSON válido." };
  }
  if (e.type === "entity.too.large") {
    return { status: 413, code: "PAYLOAD_TOO_LARGE", message: "Corpo da requisição grande demais." };
  }
  if (e.type === "encoding.unsupported" || e.type === "charset.unsupported") {
    return { status: 415, code: "UNSUPPORTED", message: "Codificação não suportada." };
  }
  const status = e.status ?? e.statusCode;
  if (e.expose && typeof status === "number" && status >= 400 && status < 500) {
    return { status, code: "BAD_REQUEST", message: "Requisição inválida." };
  }
  return null;
}

/** Erros do Postgres que são culpa do dado enviado (não do servidor) -> 4xx. */
function dbErrorOf(err: unknown): { status: number; code: string; message: string } | null {
  const code = typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined;
  if (typeof code !== "string") return null;
  switch (code) {
    case "23503": // foreign_key_violation
      return { status: 400, code: "INVALID_REFERENCE", message: "Referência inválida: um dos itens informados não existe." };
    case "23505": // unique_violation
      return { status: 409, code: "CONFLICT", message: "Já existe um registro com esses dados." };
    case "23502": // not_null_violation
    case "23514": // check_violation
    case "22P02": // invalid_text_representation
    case "22007": // invalid_datetime_format
    case "22008": // datetime_field_overflow
    case "22003": // numeric_value_out_of_range
    case "22001": // string_data_right_truncation
      return { status: 400, code: "INVALID_VALUE", message: "Um dos valores informados é inválido." };
    default:
      return null;
  }
}

/**
 * Handler de erro central. Traduz:
 *  - ZodError   -> 400 com a lista de campos inválidos
 *  - AppError   -> status/code/message do próprio erro
 *  - body-parser (JSON inválido / corpo grande) -> 400 / 413
 *  - erros de dado do Postgres (FK, formato, unique...) -> 400 / 409
 *  - resto      -> 500 genérico (sem vazar detalhe interno em produção)
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION",
        message: "Dados inválidos.",
        fields: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
    return;
  }

  if (err instanceof MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Arquivo acima do limite permitido."
        : "Falha no upload do arquivo.";
    res.status(400).json({ error: { code: "UPLOAD", message } });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  const http = httpErrorOf(err);
  if (http) {
    res.status(http.status).json({ error: { code: http.code, message: http.message } });
    return;
  }

  const db = dbErrorOf(err);
  if (db) {
    console.warn("Erro de dado tratado como", db.status, "-", (err as { code?: string; detail?: string }).code, (err as { detail?: string }).detail ?? "");
    res.status(db.status).json({ error: { code: db.code, message: db.message } });
    return;
  }

  console.error("Erro não tratado:", err);
  res.status(500).json({
    error: {
      code: "INTERNAL",
      message: "Erro interno no servidor.",
      ...(isProd ? {} : { detail: err instanceof Error ? err.message : String(err) }),
    },
  });
}
