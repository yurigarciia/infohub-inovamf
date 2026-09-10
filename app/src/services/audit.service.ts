// Camada de acesso à trilha de auditoria (RNF-05). Lê do backend
// (GET /audit-logs); a gravação acontece no servidor, dentro dos
// próprios services de negócio (teams, tasks, notifications).

import { apiFetch } from "@/lib/api-client";
import type { AuditLogWithActor, User } from "@/types";

interface RawUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: User["role"];
  isActive: boolean;
  lgpdConsentedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
interface RawAuditLog {
  id: string;
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: RawUser | null;
}

const toUser = (u: RawUser): User => ({
  ...u,
  lgpdConsentedAt: u.lgpdConsentedAt ? new Date(u.lgpdConsentedAt) : null,
  createdAt: new Date(u.createdAt),
  updatedAt: new Date(u.updatedAt),
});

/** Tela de auditoria (RNF-05) — mais recentes primeiro. */
export async function getAuditLogs(): Promise<AuditLogWithActor[]> {
  const rows = await apiFetch<RawAuditLog[]>("/audit-logs");
  return rows.map((r) => ({
    ...r,
    createdAt: new Date(r.createdAt),
    actor: r.actor ? toUser(r.actor) : null,
  }));
}
