/**
 * Tipos do domínio de usuários — espelham app/src/types/user.ts e
 * enums.ts do front (mesmo contrato JSON). snake_case do banco é
 * convertido para camelCase nos repositories.
 */

export type UserRole = "ADMIN" | "MENTOR" | "STUDENT";
export type StaffRole = "ADMIN" | "MENTOR";

export interface User {
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

export interface StudentProfile {
  userId: string;
  course: string;
  period: string;
}

/** Retorno de GET /users/me — User + perfil de aluno quando role = STUDENT. */
export interface MeResponse extends User {
  studentProfile: StudentProfile | null;
}
