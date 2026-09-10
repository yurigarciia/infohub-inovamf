import type { CookieOptions, Response } from "express";
import { isProd } from "../../config/env.js";

/**
 * Cookie do refresh token — compartilhado pelo módulo auth e pelo
 * cadastro de equipe (POST /teams faz login automático do líder).
 * Path /auth: o browser só devolve em /auth/refresh e /auth/logout.
 */
export const REFRESH_COOKIE = "infohub_rt";

function opts(expires: Date): CookieOptions {
  return { httpOnly: true, secure: isProd, sameSite: "lax", path: "/auth", expires };
}

export function setRefreshCookie(res: Response, token: string, expires: Date): void {
  res.cookie(REFRESH_COOKIE, token, opts(expires));
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: "/auth" });
}
