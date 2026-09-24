import type { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

/**
 * Limites de tentativa nas rotas de autenticação (força bruta / spam de
 * e-mail). Em memória (uma instância) — suficiente para o porte do
 * projeto; com várias réplicas passaria para um store compartilhado.
 *
 * A chave é IP + e-mail: uma conta não pode ser martelada, mas muitos
 * alunos entrando pela mesma rede (NAT da faculdade) não se bloqueiam
 * entre si. O IP real depende de `trust proxy` (app.ts).
 */
const emailOf = (req: Request): string => {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  return typeof email === "string" ? email.trim().toLowerCase().slice(0, 254) : "";
};

const keyOf = (req: Request): string => `${ipKeyGenerator(req.ip ?? "")}|${emailOf(req)}`;

const tooMany = (_req: Request, res: import("express").Response): void => {
  res.status(429).json({
    error: { code: "RATE_LIMITED", message: "Muitas tentativas. Aguarde alguns minutos e tente de novo." },
  });
};

/** Login: 8 tentativas FALHAS por IP+e-mail a cada 15 min (as bem-sucedidas não contam). */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  keyGenerator: keyOf,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: tooMany,
});

/** Pedido de link de senha/primeiro acesso: 5 por hora por IP+e-mail (cada um dispara um e-mail). */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: keyOf,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: tooMany,
});
