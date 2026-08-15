// Trilha de auditoria (RNF-05): mudanças de etapa, aprovações/
// reprovações de tarefas e envios de e-mail. Estas entradas são o
// estado inicial; os services também gravam novas entradas em runtime
// (ver services/audit.service.ts). SÓ deve ser importado por
// app/src/services/*.

import type { AuditLog } from "@/types";
import { daysFromNow } from "../utils";

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: "audit-1",
    actorUserId: "user-admin-1",
    entityType: "team",
    entityId: "team-2",
    action: "STAGE_ADVANCED",
    metadata: { fromStageId: 1, toStageId: 2 },
    createdAt: daysFromNow(-20),
  },
  {
    id: "audit-2",
    actorUserId: "user-mentor-2",
    entityType: "task_submission",
    entityId: "sub-5-1",
    action: "SUBMISSION_APPROVED",
    metadata: { taskId: "task-5" },
    createdAt: daysFromNow(-11),
  },
  {
    id: "audit-3",
    actorUserId: "user-mentor-2",
    entityType: "task_submission",
    entityId: "sub-9-1",
    action: "SUBMISSION_REJECTED",
    metadata: { taskId: "task-9", reviewComment: "Comprovante vencido." },
    createdAt: daysFromNow(-8),
  },
  {
    id: "audit-4",
    actorUserId: null,
    entityType: "email_notification",
    entityId: "email-1",
    action: "EMAIL_SENT",
    metadata: { type: "NEW_TEAM_REGISTERED", recipientUserId: "user-admin-1" },
    createdAt: daysFromNow(-10),
  },
];
