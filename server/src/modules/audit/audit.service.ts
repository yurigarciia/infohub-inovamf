import type { PoolClient } from "pg";
import { query } from "../../shared/sql.js";
import * as repo from "./audit.repository.js";
import type { AuditLogWithActorRow } from "./audit.repository.js";

/**
 * Trilha de auditoria (RNF-05). Chamado pelos outros módulos sempre que
 * acontece uma ação relevante: mudança de etapa, aprovação/reprovação,
 * envio de e-mail, CRUD de conta de staff. Nunca chamado direto por rota.
 *
 * Aceita um `client` opcional para participar de uma transação já aberta
 * pelo chamador.
 */
export interface RecordAuditLogInput {
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
  client?: PoolClient;
}

export async function recordAuditLog(input: RecordAuditLogInput): Promise<void> {
  const sql = `
    INSERT INTO audit_logs (actor_user_id, entity_type, entity_id, action, metadata)
    VALUES ($1, $2, $3, $4, $5)
  `;
  const params = [
    input.actorUserId,
    input.entityType,
    input.entityId,
    input.action,
    input.metadata ? JSON.stringify(input.metadata) : null,
  ];
  if (input.client) {
    await input.client.query(sql, params);
  } else {
    await query(sql, params);
  }
}

/** RNF-05 — trilha de auditoria para a tela do admin (mais recentes primeiro). */
export async function getRecentAuditLogs(limit = 100): Promise<AuditLogWithActorRow[]> {
  return repo.listRecent(Math.min(Math.max(limit, 1), 500));
}
