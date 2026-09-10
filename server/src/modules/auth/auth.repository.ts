import { maybeOne, query } from "../../shared/sql.js";
import type { UserRole } from "../users/users.types.js";

/** Linha de `users` com o hash da senha — só o repo de auth enxerga o hash. */
export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
}

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  replaced_by_id: string | null;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  return maybeOne<UserRow>(
    `SELECT id, name, email, password_hash, role, is_active
       FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
}

export async function findUserById(id: string): Promise<UserRow | null> {
  return maybeOne<UserRow>(
    `SELECT id, name, email, password_hash, role, is_active FROM users WHERE id = $1`,
    [id],
  );
}

// --- refresh tokens ---

export async function insertRefreshToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
}): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [input.userId, input.tokenHash, input.expiresAt, input.userAgent, input.ipAddress],
  );
  return rows[0]!.id;
}

export async function findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
  return maybeOne<RefreshTokenRow>(
    `SELECT id, user_id, token_hash, expires_at, revoked_at, replaced_by_id
       FROM refresh_tokens WHERE token_hash = $1`,
    [tokenHash],
  );
}

export async function revokeRefreshToken(id: string, replacedById: string | null): Promise<void> {
  await query(
    `UPDATE refresh_tokens SET revoked_at = now(), replaced_by_id = $2 WHERE id = $1`,
    [id, replacedById],
  );
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await query(
    `UPDATE refresh_tokens SET revoked_at = now()
       WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
}

// --- password reset tokens ---

export async function insertPasswordResetToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [input.userId, input.tokenHash, input.expiresAt],
  );
}

export interface PasswordResetTokenRow {
  id: string;
  user_id: string;
  expires_at: string;
  used_at: string | null;
}

export async function findPasswordResetTokenByHash(
  tokenHash: string,
): Promise<PasswordResetTokenRow | null> {
  return maybeOne<PasswordResetTokenRow>(
    `SELECT id, user_id, expires_at, used_at
       FROM password_reset_tokens WHERE token_hash = $1`,
    [tokenHash],
  );
}

export async function markPasswordResetUsed(id: string): Promise<void> {
  await query(`UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`, [id]);
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await query(
    `UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`,
    [userId, passwordHash],
  );
}
