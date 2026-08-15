"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/session";
import { getAuditLogs } from "@/services";
import { UserRole } from "@/types";
import type { AuditLogWithActor } from "@/types";

const ACTION_LABELS: Record<string, string> = {
  STAGE_ADVANCED: "Etapa alterada",
  SUBMISSION_APPROVED: "Entrega aprovada",
  SUBMISSION_REJECTED: "Entrega reprovada",
  EMAIL_SENT: "E-mail enviado",
  STAFF_ACCOUNT_CREATED: "Conta criada",
  STAFF_ACCOUNT_UPDATED: "Conta editada",
  STAFF_ACCOUNT_DEACTIVATED: "Conta desativada",
  STAFF_ACCOUNT_REACTIVATED: "Conta reativada",
};

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Trilha de auditoria (RNF-05): mudanças de etapa, aprovações/
 * reprovações de tarefas e envios de e-mail. Exclusiva do administrador. */
export default function AuditoriaPage() {
  const { user, isLoading: sessionLoading } = useSession();
  const [logs, setLogs] = useState<AuditLogWithActor[] | null>(null);

  useEffect(() => {
    if (user?.role !== UserRole.ADMIN) return;
    Promise.resolve().then(() => getAuditLogs().then(setLogs));
  }, [user?.role]);

  if (sessionLoading) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">Carregando…</p>;
  }

  if (user?.role !== UserRole.ADMIN) {
    return (
      <p className="px-6 py-8 text-sm text-muted-foreground">
        A auditoria é exclusiva da coordenação (administrador).
      </p>
    );
  }

  if (!logs) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">Carregando…</p>;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Mudanças de etapa, aprovações/reprovações e envios de e-mail (RNF-05)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4">Data/hora</th>
                    <th className="py-2 pr-4">Ator</th>
                    <th className="py-2 pr-4">Ação</th>
                    <th className="py-2">Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {log.actor?.name ?? <span className="text-muted-foreground">Sistema</span>}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {log.entityType} · {log.entityId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
