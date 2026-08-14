// Espelha o model AuditLog de app/prisma/schema.prisma.

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
