import type { CookieOptions, Request, Response } from "express";
import { z } from "zod";
import { isProd } from "../../config/env.js";
import * as service from "./auth.service.js";
import type { SessionContext } from "./auth.service.js";

const REFRESH_COOKIE = "infohub_rt";

function cookieOpts(expires: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/auth", // só enviado para /auth/refresh e /auth/logout
    expires,
  };
}

function ctxOf(req: Request): SessionContext {
  return {
    userAgent: req.header("user-agent") ?? null,
    ipAddress: req.ip ?? null,
  };
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = loginSchema.parse(req.body);
  const result = await service.login(email, password, ctxOf(req));
  res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOpts(result.refreshExpiresAt));
  res.json({ accessToken: result.accessToken, user: result.user });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!raw) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sem sessão." } });
    return;
  }
  const result = await service.refresh(raw, ctxOf(req));
  res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOpts(result.refreshExpiresAt));
  res.json({ accessToken: result.accessToken, user: result.user });
}

export async function logout(req: Request, res: Response): Promise<void> {
  await service.logout(req.cookies?.[REFRESH_COOKIE] as string | undefined);
  res.clearCookie(REFRESH_COOKIE, { path: "/auth" });
  res.status(204).end();
}

const requestResetSchema = z.object({ email: z.string().email() });

export async function requestPasswordReset(req: Request, res: Response): Promise<void> {
  const { email } = requestResetSchema.parse(req.body);
  await service.requestPasswordReset(email);
  res.status(204).end(); // sempre 204 — não vaza se o e-mail existe
}

const confirmResetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function confirmPasswordReset(req: Request, res: Response): Promise<void> {
  const { token, newPassword } = confirmResetSchema.parse(req.body);
  await service.confirmPasswordReset(token, newPassword);
  res.status(204).end();
}
