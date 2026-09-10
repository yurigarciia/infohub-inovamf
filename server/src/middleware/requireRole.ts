import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../modules/users/users.types.js";
import { ForbiddenError, UnauthorizedError } from "../shared/errors.js";

/**
 * Usar sempre DEPOIS de authRequired. Bloqueia quem não tem um dos
 * papéis informados (RNF-03).
 *
 *   router.get("/staff", authRequired, requireRole("ADMIN"), ...)
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError();
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError("Seu perfil não tem acesso a esta ação.");
    }
    next();
  };
}
