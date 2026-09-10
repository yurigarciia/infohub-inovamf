import type { UserRole } from "../modules/users/users.types.js";

declare global {
  namespace Express {
    interface Request {
      /** Preenchido pelo middleware `authRequired` a partir do access token. */
      user?: { id: string; role: UserRole };
    }
  }
}

export {};
