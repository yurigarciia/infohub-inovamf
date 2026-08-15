"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session";
import { advanceTeamStage, getJourneyStages, getTeamDetail, getTasksForTeam } from "@/services";
import { UserRole } from "@/types";
import type { JourneyStage, TaskWithDetails, TeamDetail } from "@/types";
import { TeamHeader } from "./team-header";
import { TeamInfoCard } from "./team-info-card";
import { TeamMembersCard } from "./team-members-card";
import { TeamNotesCard } from "./team-notes-card";
import { TeamStageHistoryCard } from "./team-stage-history-card";
import { TeamTasksCard } from "./team-tasks-card";

/** Página de detalhe da equipe (RF-08, RF-09, RF-10): orquestra o
 * carregamento de dados e a guarda de acesso; o layout em si é montado
 * a partir dos cards especializados em `components/teams/*`. */
export function TeamDetailView({ teamId }: { teamId: string }) {
  const { user, isLoading: sessionLoading } = useSession();
  const [team, setTeam] = useState<TeamDetail | null | undefined>(undefined);
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [stages, setStages] = useState<JourneyStage[]>([]);
  const [isChangingStage, setIsChangingStage] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function reload() {
    try {
      const [loadedTeam, loadedTasks] = await Promise.all([
        getTeamDetail(teamId),
        getTasksForTeam(teamId),
      ]);
      setTeam(loadedTeam);
      setTasks(loadedTasks);
    } catch {
      setTeam(null);
    }
  }

  useEffect(() => {
    // Adiado pra um microtask (Promise.resolve().then) pra não disparar
    // setState síncrono no corpo do effect (ver T-FE-08 para o mesmo padrão).
    Promise.resolve().then(() => {
      void reload();
      getJourneyStages().then(setStages);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  if (sessionLoading || team === undefined) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">Carregando…</p>;
  }

  if (team === null) {
    return <p className="px-6 py-8 text-sm text-destructive">Equipe não encontrada.</p>;
  }

  const isStaff = user?.role === UserRole.ADMIN || user?.role === UserRole.MENTOR;
  const isMember = team.members.some((m) => m.user.id === user?.id);

  if (!isStaff && !isMember) {
    return <p className="px-6 py-8 text-sm text-destructive">Você não tem acesso a esta equipe.</p>;
  }

  async function handleAdvance(direction: 1 | -1) {
    if (!user || !team) return;
    const targetStageNumber = team.currentStage.number + direction;
    if (targetStageNumber < 1 || targetStageNumber > 6) return;
    setActionError(null);
    setIsChangingStage(true);
    try {
      // journey.service valida pelo id da etapa, não pelo número —
      // como as etapas são sequenciais 1-6 com o mesmo id/número aqui,
      // usamos currentStageId +/- 1 diretamente.
      await advanceTeamStage(team.id, team.currentStageId + direction, user.id);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Não foi possível mudar a etapa.");
    } finally {
      setIsChangingStage(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground">
          ← Voltar ao funil
        </Link>
      </div>

      <TeamHeader
        team={team}
        isStaff={isStaff}
        isChangingStage={isChangingStage}
        onAdvance={handleAdvance}
      />
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <TeamInfoCard team={team} />
        <TeamMembersCard team={team} />
        <TeamStageHistoryCard stageHistory={team.stageHistory} stages={stages} />
        <TeamTasksCard
          team={team}
          tasks={tasks}
          stages={stages}
          isStaff={isStaff}
          createdById={user!.id}
          onReload={reload}
        />
        {isStaff && <TeamNotesCard team={team} authorId={user!.id} onAdded={reload} />}
      </div>
    </div>
  );
}
