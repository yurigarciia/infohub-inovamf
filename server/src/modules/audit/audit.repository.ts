import { query } from "../../shared/sql.js";

export interface AuditLogWithActorRow {
  id: string;
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: "ADMIN" | "MENTOR" | "STUDENT";
    isActive: boolean;
    lgpdConsentedAt: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

/** Trilha de auditoria mais recente primeiro (RNF-05), com o ator resolvido. */
export async function listRecent(limit: number): Promise<AuditLogWithActorRow[]> {
  return query<AuditLogWithActorRow>(
    `SELECT a.id,
            a.actor_user_id AS "actorUserId",
            a.entity_type   AS "entityType",
            a.entity_id     AS "entityId",
            a.action,
            a.metadata,
            a.created_at    AS "createdAt",
            CASE WHEN u.id IS NULL THEN NULL ELSE jsonb_build_object(
              'id', u.id, 'name', u.name, 'email', u.email, 'phone', u.phone,
              'role', u.role, 'isActive', u.is_active,
              'lgpdConsentedAt', u.lgpd_consented_at,
              'createdAt', u.created_at, 'updatedAt', u.updated_at
            ) END AS actor
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_user_id
      ORDER BY a.created_at DESC
      LIMIT $1`,
    [limit],
  );
}
