// Espelha os models User/StudentProfile de app/prisma/schema.prisma.

import { UserRole } from "./enums";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  lgpdConsentedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Extensão 1:1 de User, exclusiva para role = STUDENT (ver decisoes.md). */
export interface StudentProfile {
  userId: string;
  course: string;
  period: string;
}

/** "View" combinando User + StudentProfile, do jeito que uma query real
 * com `include: { studentProfile: true }` devolveria. */
export interface StudentUser extends User {
  role: typeof UserRole.STUDENT;
  studentProfile: StudentProfile;
}
