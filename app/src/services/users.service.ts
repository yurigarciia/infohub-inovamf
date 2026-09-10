// Camada de acesso a usuários. Fala com o backend (server/) via
// api-client — ver docs/frontend-plan.md, Seção 4.1.
//
// findOrCreateStudentByEmail ainda é mock (usada pelo cadastro de
// equipe — migra junto com teams.service).

import { MOCK_STUDENT_PROFILES, MOCK_USERS } from "@/mocks/data";
// listUsers continua mock — só o SessionProvider usa, no atalho de
// "trocar de usuário" do cadastro de equipe (remove junto com B3).
import { generateId } from "@/mocks/utils";
import { apiFetch } from "@/lib/api-client";
import { UserRole } from "@/types";
import type { StudentProfile, StudentUser, User } from "@/types";
import { delay } from "./latency";

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

// ---------------------------------------------------------------------
// Ainda mock — migra junto com teams.service (cadastro de equipe, B3).
// ---------------------------------------------------------------------

/** Mock — lista todos os usuários conhecidos. Usada só pelo
 * SessionProvider para o atalho de "logar como líder recém-criado" no
 * cadastro de equipe. Sai quando B3 migrar teams.service. */
export async function listUsers(): Promise<User[]> {
  await delay();
  return [...MOCK_USERS];
}

export interface FindOrCreateStudentInput {
  name: string;
  email: string;
  phone?: string;
  course: string;
  period: string;
}

async function findUserByEmailMock(email: string): Promise<User | null> {
  await delay();
  const normalized = email.trim().toLowerCase();
  return MOCK_USERS.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export async function findOrCreateStudentByEmail(
  input: FindOrCreateStudentInput,
): Promise<StudentUser> {
  const existing = await findUserByEmailMock(input.email);
  if (existing) {
    const profile = MOCK_STUDENT_PROFILES.find((sp) => sp.userId === existing.id) ?? null;
    if (existing.role !== UserRole.STUDENT || !profile) {
      throw new Error(`E-mail ${input.email} já está cadastrado com outro papel.`);
    }
    return { ...existing, role: UserRole.STUDENT, studentProfile: profile };
  }

  await delay();
  const now = new Date();
  const user: User = {
    id: generateId("user-student"),
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    role: UserRole.STUDENT,
    isActive: true,
    lgpdConsentedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  const profile: StudentProfile = {
    userId: user.id,
    course: input.course,
    period: input.period,
  };
  MOCK_USERS.push(user);
  MOCK_STUDENT_PROFILES.push(profile);
  return { ...user, role: UserRole.STUDENT, studentProfile: profile };
}
