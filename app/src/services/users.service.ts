// Camada de acesso a usuários. Fala com o backend (server/) via
// api-client — ver docs/frontend-plan.md, Seção 4.1.

import { apiFetch } from "@/lib/api-client";
import { UserRole } from "@/types";
import type { StudentProfile, User } from "@/types";

/** Converte o User serializado da API (datas em ISO string) para o
 * formato que as telas esperam (Date). */
interface ApiUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  lgpdConsentedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function toUser(u: ApiUser): User {
  return {
    ...u,
    lgpdConsentedAt: u.lgpdConsentedAt ? new Date(u.lgpdConsentedAt) : null,
    createdAt: new Date(u.createdAt),
    updatedAt: new Date(u.updatedAt),
  };
}

interface ApiMe extends ApiUser {
  studentProfile: StudentProfile | null;
}

/** GET /users/me — usuário da sessão atual (+ perfil de aluno). */
export async function getMe(): Promise<(User & { studentProfile: StudentProfile | null }) | null> {
  try {
    const me = await apiFetch<ApiMe>("/users/me");
    return { ...toUser(me), studentProfile: me.studentProfile };
  } catch {
    return null;
  }
}

/** RF-07 — mentores para o filtro "mentor responsável". */
export async function getMentors(): Promise<User[]> {
  const rows = await apiFetch<ApiUser[]>("/users/mentors");
  return rows.map(toUser);
}

/** RF-03 — contas de administrador/mentor geridas pelo admin. */
export async function getStaffUsers(): Promise<User[]> {
  const rows = await apiFetch<ApiUser[]>("/users/staff");
  return rows.map(toUser);
}

export interface CreateStaffUserInput {
  name: string;
  email: string;
  phone?: string;
  role: typeof UserRole.ADMIN | typeof UserRole.MENTOR;
}

/** RF-03 — cria conta de admin/mentor. O ator vem do token no backend
 * (`_actorUserId` mantido só pela compatibilidade das telas). */
export async function createStaffUser(
  input: CreateStaffUserInput,
  _actorUserId?: string,
): Promise<User> {
  void _actorUserId;
  const created = await apiFetch<ApiUser>("/users/staff", { method: "POST", body: input });
  return toUser(created);
}

export interface UpdateStaffUserInput {
  userId: string;
  name?: string;
  phone?: string;
  role?: typeof UserRole.ADMIN | typeof UserRole.MENTOR;
}

/** RF-03 — edita nome/telefone/papel de uma conta de admin/mentor. */
export async function updateStaffUser(
  input: UpdateStaffUserInput,
  _actorUserId?: string,
): Promise<User> {
  void _actorUserId;
  const { userId, ...patch } = input;
  const updated = await apiFetch<ApiUser>(`/users/staff/${userId}`, {
    method: "PATCH",
    body: patch,
  });
  return toUser(updated);
}

/** RF-03 — ativar/desativar uma conta de admin/mentor. */
export async function setStaffUserActive(
  userId: string,
  isActive: boolean,
  _actorUserId?: string,
): Promise<User> {
  void _actorUserId;
  const updated = await apiFetch<ApiUser>(`/users/staff/${userId}/active`, {
    method: "PATCH",
    body: { isActive },
  });
  return toUser(updated);
}
