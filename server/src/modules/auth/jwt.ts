import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import type { UserRole } from "../users/users.types.js";
import { UnauthorizedError } from "../../shared/errors.js";

export interface AccessTokenPayload {
  sub: string; // user id
  role: UserRole;
}

/** Assina um access token de vida curta (stateless — não vai pro banco). */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"],
  });
}

/** Valida e decodifica o access token. Lança 401 se inválido/expirado. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof decoded === "string" || !decoded.sub || !("role" in decoded)) {
      throw new Error("payload inesperado");
    }
    return { sub: String(decoded.sub), role: decoded.role as UserRole };
  } catch {
    throw new UnauthorizedError("Sessão inválida ou expirada.");
  }
}
