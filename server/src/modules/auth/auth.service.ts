import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import { BadRequestError, UnauthorizedError } from "../../shared/errors.js";
import { recordNotification } from "../notifications/notifications.service.js";
import { signAccessToken } from "./jwt.js";
import { generateOpaqueToken, hashToken } from "./tokens.js";
import * as repo from "./auth.repository.js";
import type { UserRole } from "../users/users.types.js";

export interface SessionContext {
  userAgent: string | null;
  ipAddress: string | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string; // valor bruto — o controller põe no cookie
  refreshExpiresAt: Date;
  user: { id: string; name: string; email: string; role: UserRole };
}

function refreshExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

async function issueSession(
  user: { id: string; name: string; email: string; role: UserRole },
  ctx: SessionContext,
): Promise<AuthResult> {
  const refreshToken = generateOpaqueToken();
  const refreshExpiresAt = refreshExpiry();
  await repo.insertRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiresAt,
    userAgent: ctx.userAgent,
    ipAddress: ctx.ipAddress,
  });
  return {
    accessToken: signAccessToken({ sub: user.id, role: user.role }),
    refreshToken,
    refreshExpiresAt,
    user,
  };
}

/**
 * Emite uma sessão para um usuário já validado por outro fluxo — hoje,
 * o cadastro de equipe (POST /teams) faz login automático do líder.
 */
export async function startSessionFor(
  user: { id: string; name: string; email: string; role: UserRole },
  ctx: SessionContext,
): Promise<AuthResult> {
  return issueSession(user, ctx);
}

/** RF-01 — login por e-mail + senha. */
export async function login(
  email: string,
  password: string,
  ctx: SessionContext,
): Promise<AuthResult> {
  const row = await repo.findUserByEmail(email);
  // mesma resposta para "não existe" e "senha errada" (não vaza quais e-mails existem)
  if (!row) {
    // custo constante — evita timing attack de enumeração
    await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinva");
    throw new UnauthorizedError("E-mail ou senha inválidos.");
  }
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) throw new UnauthorizedError("E-mail ou senha inválidos.");
  if (!row.is_active) throw new UnauthorizedError("Esta conta está desativada.");

  return issueSession({ id: row.id, name: row.name, email: row.email, role: row.role }, ctx);
}

/**
 * RF-01 — rotação do refresh token. O antigo é revogado e apontado para
 * o novo (`replaced_by_id`). Se um token já revogado for reapresentado,
 * é sinal de reuso (roubo) — revoga toda a cadeia daquele usuário.
 */
export async function refresh(rawRefreshToken: string, ctx: SessionContext): Promise<AuthResult> {
  const current = await repo.findRefreshTokenByHash(hashToken(rawRefreshToken));
  if (!current) throw new UnauthorizedError("Sessão inválida.");

  if (current.revoked_at) {
    // reuso de token revogado -> derruba todas as sessões do usuário
    await repo.revokeAllUserRefreshTokens(current.user_id);
    throw new UnauthorizedError("Sessão inválida. Faça login novamente.");
  }
  if (new Date(current.expires_at).getTime() < Date.now()) {
    throw new UnauthorizedError("Sessão expirada. Faça login novamente.");
  }

  const userRow = await repo.findUserById(current.user_id);
  if (!userRow || !userRow.is_active) {
    await repo.revokeRefreshToken(current.id, null);
    throw new UnauthorizedError("Sessão inválida.");
  }

  const next = await issueSession(
    { id: userRow.id, name: userRow.name, email: userRow.email, role: userRow.role },
    ctx,
  );
  await repo.revokeRefreshToken(current.id, null);
  return next;
}

/** RF-01 — logout: revoga o refresh token atual. */
export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) return;
  const current = await repo.findRefreshTokenByHash(hashToken(rawRefreshToken));
  if (current && !current.revoked_at) {
    await repo.revokeRefreshToken(current.id, null);
  }
}

/**
 * RF-01 — "esqueci minha senha", passo 1. Gera um token de uso único e
 * "envia" por e-mail. Sempre retorna sem erro, exista o e-mail ou não
 * (não vaza quais e-mails estão cadastrados).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const row = await repo.findUserByEmail(email);
  if (!row || !row.is_active) return;

  const rawToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
  await repo.insertPasswordResetToken({
    userId: row.id,
    tokenHash: hashToken(rawToken),
    expiresAt,
  });

  await recordNotification({
    recipientUserId: row.id,
    type: "MANUAL_REMINDER", // não há tipo próprio no enum; reaproveitado
    subject: "Redefinição de senha — InfoHub",
    body: `Use este token para redefinir sua senha (válido por 1 hora): ${rawToken}`,
  });
}

/** RF-01 — "esqueci minha senha", passo 2: troca a senha com o token. */
export async function confirmPasswordReset(rawToken: string, newPassword: string): Promise<void> {
  if (newPassword.length < 8) {
    throw new BadRequestError("A nova senha precisa ter ao menos 8 caracteres.");
  }
  const row = await repo.findPasswordResetTokenByHash(hashToken(rawToken));
  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
    throw new BadRequestError("Token de redefinição inválido ou expirado.");
  }

  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  await repo.updateUserPassword(row.user_id, passwordHash);
  await repo.markPasswordResetUsed(row.id);
  await repo.revokeAllUserRefreshTokens(row.user_id); // desloga tudo
}
