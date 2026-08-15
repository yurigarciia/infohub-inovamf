"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/session";
import { getDashboardStats } from "@/services";
import { UserRole } from "@/types";
import type { DashboardStats } from "@/types";

/** Cor da barra por posição na jornada — mesma escala de marca usada
 * nos badges de etapa em outras telas (etapa 1 mais clara/laranja,
 * etapa 6 mais escura/bordô), reforçando visualmente "a jornada
 * esquenta conforme avança". */
const STAGE_BAR_COLORS = [
  "bg-brand-300",
  "bg-brand-400",
  "bg-brand-500",
  "bg-brand-600",
  "bg-brand-700",
  "bg-brand-800",
];

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

/** Dashboard com indicadores gerais para a coordenação (RF-22). */
export default function AdminDashboardPage() {
  const { user, isLoading: sessionLoading } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (user?.role !== UserRole.ADMIN) return;
    Promise.resolve().then(() => getDashboardStats().then(setStats));
  }, [user?.role]);

  if (sessionLoading) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">Carregando…</p>;
  }

  if (user?.role !== UserRole.ADMIN) {
    return (
      <p className="px-6 py-8 text-sm text-muted-foreground">
        O dashboard é exclusivo da coordenação (administrador).
      </p>
    );
  }

  if (!stats) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">Carregando…</p>;
  }

  const maxStageCount = Math.max(1, ...stats.byStage.map((s) => s.count));

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do funil InfoHub → InovAMF</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Equipes ativas" value={stats.totalActiveTeams} />
        <StatTile label="Tarefas atrasadas" value={stats.lateTasksCount} />
        <StatTile label="Prontas para o InovAMF" value={stats.readyForInovamfCount} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribuição por etapa</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {stats.byStage.map((stage, index) => (
            <div key={stage.stageId} className="flex items-center gap-3">
              <span className="w-48 shrink-0 text-sm text-muted-foreground">{stage.stageName}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className={`h-full rounded-full ${STAGE_BAR_COLORS[index % STAGE_BAR_COLORS.length]}`}
                  style={{ width: `${(stage.count / maxStageCount) * 100}%` }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-sm font-medium tabular-nums">
                {stage.count}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
