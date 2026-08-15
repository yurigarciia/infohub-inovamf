// Espelha o model AuditLog de app/prisma/schema.prisma.

import type { User } from "./user";

/** Trilha de auditoria (RNF-05). */
export interface AuditLog {
  id: string;
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

/** "View" usada na tela de auditoria — ator já resolvido (null = ação
 * automática do sistema). */
export interface AuditLogWithActor extends AuditLog {
  actor: User | null;
}
