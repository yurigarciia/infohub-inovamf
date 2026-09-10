import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../modules/auth/jwt.js";
import { UnauthorizedError } from "../shared/errors.js";

/**
 * Exige um access token válido no header Authorization: Bearer <token>.
 * Preenche req.user = { id, role }. Rotas que não usam isto são públicas.
 */
export function authRequired(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new UnauthorizedError("Faça login para continuar.");
  }
  const payload = verifyAccessToken(token);
  req.user = { id: payload.sub, role: payload.role };
  next();
}
