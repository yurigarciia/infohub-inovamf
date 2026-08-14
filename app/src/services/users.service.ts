// Camada de acesso a usuários. Hoje lê/escreve nos mocks em memória;
// amanhã troca para Prisma/API sem mudar as assinaturas (ver
// docs/frontend-plan.md, Seção 4.1).

import { MOCK_STUDENT_PROFILES, MOCK_USERS } from "@/mocks/data";
import { generateId } from "@/mocks/utils";
import { UserRole } from "@/types";
import type { StudentProfile, StudentUser, User } from "@/types";
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
