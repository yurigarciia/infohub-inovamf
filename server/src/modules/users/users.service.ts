import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { env } from "../../config/env.js";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../shared/errors.js";
import { recordAuditLog } from "../audit/audit.service.js";
import { recordNotification } from "../notifications/notifications.service.js";
import * as repo from "./users.repository.js";
import type { MeResponse, StaffRole, User } from "./users.types.js";

export async function getMe(userId: string): Promise<MeResponse> {
  const me = await repo.findMe(userId);
  if (!me) throw new NotFoundError("Usuário não encontrado.");
  return me;
}

/** RF-07 — mentores para o filtro "mentor responsável". */
export async function getMentors(): Promise<User[]> {
  return repo.listMentors();
}

/** RF-03 — contas de administrador/mentor. */
export async function getStaff(): Promise<User[]> {
  return repo.listStaff();
}

export interface CreateStaffInput {
  name: string;
  email: string;
  phone?: string;
  role: StaffRole;
}

/**
 * RF-03 — cria conta de admin/mentor. Gera uma senha provisória e a
 * "envia" por e-mail (nesta fase, loga no console). O ator vem do token.
 */
export async function createStaff(input: CreateStaffInput, actorUserId: string): Promise<User> {
  if (await repo.emailExists(input.email)) {
    throw new ConflictError(`Já existe uma conta com o e-mail ${input.email}.`);
  }
  const tempPassword = randomBytes(6).toString("base64url");
  const passwordHash = await bcrypt.hash(tempPassword, env.BCRYPT_ROUNDS);

  const user = await repo.insertStaff({
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone?.trim() || null,
    role: input.role,
    passwordHash,
  });

  await recordAuditLog({
    actorUserId,
    entityType: "user",
    entityId: user.id,
    action: "STAFF_ACCOUNT_CREATED",
    metadata: { role: user.role },
  });
  await recordNotification({
    recipientUserId: user.id,
    type: "MANUAL_REMINDER",
    subject: "Sua conta no InfoHub foi criada",
    body: `Acesse com o e-mail ${user.email} e a senha provisória: ${tempPassword} (troque no primeiro acesso).`,
  });

  return user;
}

export interface UpdateStaffInput {
  name?: string;
  phone?: string;
  role?: StaffRole;
}

export async function updateStaff(
  id: string,
  input: UpdateStaffInput,
  actorUserId: string,
): Promise<User> {
  const user = await repo.updateStaff(id, {
    name: input.name?.trim(),
    phone: input.phone?.trim(),
    role: input.role,
  });
  if (!user) throw new NotFoundError("Conta de administrador/mentor não encontrada.");

  await recordAuditLog({
    actorUserId,
    entityType: "user",
    entityId: user.id,
    action: "STAFF_ACCOUNT_UPDATED",
  });
  return user;
}

/** RF-03 — ativar/desativar conta de staff, com trava de auto-desativação. */
export async function setStaffActive(
  id: string,
  isActive: boolean,
  actorUserId: string,
): Promise<User> {
  if (id === actorUserId && !isActive) {
    throw new ForbiddenError("Você não pode desativar a própria conta.");
  }
  const user = await repo.setActive(id, isActive);
  if (!user) throw new NotFoundError("Conta de administrador/mentor não encontrada.");

  await recordAuditLog({
    actorUserId,
    entityType: "user",
    entityId: user.id,
    action: isActive ? "STAFF_ACCOUNT_REACTIVATED" : "STAFF_ACCOUNT_DEACTIVATED",
  });
  return user;
}

/** Valida um id (UUID) recebido de parâmetro de rota. */
export function assertUuid(value: unknown): string {
  const s = String(value);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    throw new BadRequestError("Identificador inválido.");
  }
  return s;
}
