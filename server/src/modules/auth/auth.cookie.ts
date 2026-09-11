import type { CookieOptions, Response } from "express";
import { env, isProd } from "../../config/env.js";

/**
 * Cookie do refresh token — compartilhado pelo módulo auth e pelo
 * cadastro de equipe (POST /teams faz login automático do líder).
 *
 * O path vem de REFRESH_COOKIE_PATH (default "/"). No deploy
 * single-service o front chama a API por `/api/auth/...` (proxy do
 * Next), então o path precisa cobrir esse caminho — "/" cobre tudo e
 * também funciona no acesso direto em dev.
 */
export const REFRESH_COOKIE = "infohub_rt";
const COOKIE_PATH = env.REFRESH_COOKIE_PATH;

function opts(expires: Date): CookieOptions {
  return { httpOnly: true, secure: isProd, sameSite: "lax", path: COOKIE_PATH, expires };
}

export function setRefreshCookie(res: Response, token: string, expires: Date): void {
  res.cookie(REFRESH_COOKIE, token, opts(expires));
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
}
