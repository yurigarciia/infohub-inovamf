import { createHash, randomBytes } from "node:crypto";

/**
 * Refresh token e token de recuperação de senha são strings opacas
 * aleatórias. O valor bruto vai para o cliente (cookie / link de
 * e-mail); no banco guardamos só o hash SHA-256 — mesmo raciocínio de
 * nunca guardar senha em texto puro (ver docs/modelagem-banco.md).
 */

export function generateOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
