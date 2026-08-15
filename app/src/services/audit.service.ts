// Camada de acesso à trilha de auditoria (RNF-05): mudanças de etapa,
// aprovações/reprovações de tarefas e envios de e-mail. Hoje lê/escreve
// nos mocks em memória; amanhã vira uma tabela real, gravada pelo
// mesmo código que já chama recordAuditLog() hoje.

import { MOCK_AUDIT_LOGS, MOCK_USERS } from "@/mocks/data";
import { generateId } from "@/mocks/utils";
import type { AuditLog, AuditLogWithActor } from "@/types";
import { delay } from "./latency";

export interface RecordAuditLogInput {
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
}

/** Registra uma entrada de auditoria — chamada por outros services
 * (nunca diretamente por telas) sempre que uma ação relevante
 * acontece: mudança de etapa, aprovação/reprovação, envio de e-mail. */
export async function recordAuditLog(input: RecordAuditLogInput): Promise<AuditLog> {
  const entry: AuditLog = {
    id: generateId("audit"),
    actorUserId: input.actorUserId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    metadata: input.metadata ?? null,
    createdAt: new Date(),
  };
  MOCK_AUDIT_LOGS.push(entry);
  return entry;
}

/** Tela de auditoria (RNF-05) — mais recentes primeiro. */
export async function getAuditLogs(): Promise<AuditLogWithActor[]> {
  await delay();
  return [...MOCK_AUDIT_LOGS]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((entry) => ({
      ...entry,
      actor: entry.actorUserId ? (MOCK_USERS.find((u) => u.id === entry.actorUserId) ?? null) : null,
    }));
}
