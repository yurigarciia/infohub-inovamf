import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { AppError } from "../shared/errors.js";
import { isProd } from "../config/env.js";

/** 404 para rota não registrada. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Rota não encontrada." } });
}

/**
 * Handler de erro central. Traduz:
 *  - ZodError   -> 400 com a lista de campos inválidos
 *  - AppError   -> status/code/message do próprio erro
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

  console.error("Erro não tratado:", err);
  res.status(500).json({
    error: {
      code: "INTERNAL",
      message: "Erro interno no servidor.",
      ...(isProd ? {} : { detail: err instanceof Error ? err.message : String(err) }),
    },
  });
}
