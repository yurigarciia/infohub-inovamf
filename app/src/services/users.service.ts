// Camada de acesso a usuários. Hoje lê/escreve nos mocks em memória;
// amanhã troca para Prisma/API sem mudar as assinaturas (ver
// docs/frontend-plan.md, Seção 4.1).

import { MOCK_STUDENT_PROFILES, MOCK_USERS } from "@/mocks/data";
import { generateId } from "@/mocks/utils";
import { UserRole } from "@/types";
import type { StudentProfile, StudentUser, User } from "@/types";
import { recordAuditLog } from "./audit.service";
import { delay } from "./latency";

export async function getUserById(id: string): Promise<User | null> {
  await delay();
  return MOCK_USERS.find((u) => u.id === id) ?? null;
}

/** Lista todos os usuários — usada hoje pelo seletor de "papel ativo"
 * (T-FE-05), que substitui o login real enquanto ele não existe (T-FE-06). */
export async function listUsers(): Promise<User[]> {
  await delay();
  return [...MOCK_USERS];
}

/** Mentores disponíveis para o filtro "mentor responsável" (RF-07). */
export async function getMentors(): Promise<User[]> {
  await delay();
  return MOCK_USERS.filter((u) => u.role === UserRole.MENTOR);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  await delay();
  const normalized = email.trim().toLowerCase();
  return MOCK_USERS.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export async function getStudentProfile(userId: string): Promise<StudentProfile | null> {
  await delay();
  return MOCK_STUDENT_PROFILES.find((sp) => sp.userId === userId) ?? null;
}

/** Login mockado (T-FE-06): sem senha real nesta fase, só localiza a
 * conta pelo e-mail — a mesma assinatura que o login real vai ter
 * (recebe credenciais, devolve o usuário ou null). */
export async function authenticateByEmail(
  email: string,
  _password: string,
): Promise<User | null> {
  void _password; // ignorado nesta fase — sem verificação real de senha
  return findUserByEmail(email);
}

export interface FindOrCreateStudentInput {
  name: string;
  email: string;
  phone?: string;
  course: string;
  period: string;
}

/** Busca por e-mail e cria se não existir (ver PLAN.md, ticket T005):
 * usado pelo formulário de inscrição para não duplicar contas quando
 * o mesmo aluno já existe (ex.: já integra outra equipe — Q4). */
export async function findOrCreateStudentByEmail(
  input: FindOrCreateStudentInput,
): Promise<StudentUser> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    const profile = await getStudentProfile(existing.id);
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

/** RF-03: contas de administrador/mentor geridas pelo admin. */
export async function getStaffUsers(): Promise<User[]> {
  await delay();
  return MOCK_USERS.filter((u) => u.role === UserRole.ADMIN || u.role === UserRole.MENTOR);
}

export interface CreateStaffUserInput {
  name: string;
  email: string;
  phone?: string;
  role: typeof UserRole.ADMIN | typeof UserRole.MENTOR;
}

/** RF-03: cria uma conta de administrador ou mentor. */
export async function createStaffUser(
  input: CreateStaffUserInput,
  actorUserId: string,
): Promise<User> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new Error(`Já existe uma conta com o e-mail ${input.email}.`);
  }

  await delay();
  const now = new Date();
  const user: User = {
    id: generateId("user-staff"),
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    role: input.role,
    isActive: true,
    lgpdConsentedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  MOCK_USERS.push(user);

  await recordAuditLog({
    actorUserId,
    entityType: "user",
    entityId: user.id,
    action: "STAFF_ACCOUNT_CREATED",
    metadata: { role: user.role },
  });

  return user;
}

export interface UpdateStaffUserInput {
  userId: string;
  name?: string;
  phone?: string;
  role?: typeof UserRole.ADMIN | typeof UserRole.MENTOR;
}

/** RF-03: edita nome/telefone/papel de uma conta de administrador/mentor. */
export async function updateStaffUser(
  input: UpdateStaffUserInput,
  actorUserId: string,
): Promise<User> {
  await delay();
  const user = MOCK_USERS.find((u) => u.id === input.userId);
  if (!user) throw new Error(`Usuário ${input.userId} não encontrado.`);

  if (input.name !== undefined) user.name = input.name;
  if (input.phone !== undefined) user.phone = input.phone;
  if (input.role !== undefined) user.role = input.role;
  user.updatedAt = new Date();

  await recordAuditLog({
    actorUserId,
    entityType: "user",
    entityId: user.id,
    action: "STAFF_ACCOUNT_UPDATED",
  });

  return user;
}

/** RF-03: ativar/desativar uma conta de administrador/mentor. */
export async function setStaffUserActive(
  userId: string,
  isActive: boolean,
  actorUserId: string,
): Promise<User> {
  if (userId === actorUserId && !isActive) {
    throw new Error("Você não pode desativar sua própria conta.");
  }

  await delay();
  const user = MOCK_USERS.find((u) => u.id === userId);
  if (!user) throw new Error(`Usuário ${userId} não encontrado.`);

  user.isActive = isActive;
  user.updatedAt = new Date();

  await recordAuditLog({
    actorUserId,
    entityType: "user",
    entityId: user.id,
    action: isActive ? "STAFF_ACCOUNT_REACTIVATED" : "STAFF_ACCOUNT_DEACTIVATED",
  });

  return user;
}
