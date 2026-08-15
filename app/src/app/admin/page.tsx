"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ALL_VALUE } from "@/components/filters/filter-select";
import { ExportTeamsCsvButton } from "@/components/admin/export-teams-csv-button";
import { TeamBoardCard } from "@/components/admin/team-board-card";
import { TeamFiltersBar } from "@/components/admin/team-filters-bar";
import {
  getCohorts,
  getIdeaAreas,
  getJourneyStages,
  getMentors,
  getTeamsByStage,
} from "@/services";
import { useSession } from "@/lib/session";
import { TaskStatus, UserRole } from "@/types";
import type { IdeaArea, JourneyStage, TeamBoardItem, TeamFilters, User } from "@/types";

/** Painel do administrador/mentor — funil/kanban (RF-06, RF-07).
 * RNF-03: restrito a ADMIN/MENTOR — aluno ou visitante não autenticado
 * não deve ver dados internos de nenhuma equipe aqui. */
export default function AdminHomePage() {
  const { user, isLoading: sessionLoading } = useSession();
  const [stages, setStages] = useState<JourneyStage[]>([]);
  const [areas, setAreas] = useState<IdeaArea[]>([]);
  const [mentors, setMentors] = useState<User[]>([]);
  const [cohorts, setCohorts] = useState<string[]>([]);
  const [teams, setTeams] = useState<TeamBoardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [course, setCourse] = useState("");
  const [areaId, setAreaId] = useState<string>(ALL_VALUE);
  const [taskStatus, setTaskStatus] = useState<string>(ALL_VALUE);
  const [mentorId, setMentorId] = useState<string>(ALL_VALUE);
  const [cohort, setCohort] = useState<string>(ALL_VALUE);

  useEffect(() => {
    Promise.all([getJourneyStages(), getIdeaAreas(), getMentors(), getCohorts()]).then(
      ([loadedStages, loadedAreas, loadedMentors, loadedCohorts]) => {
        setStages(loadedStages);
        setAreas(loadedAreas);
        setMentors(loadedMentors);
        setCohorts(loadedCohorts);
      },
    );
  }, []);

  useEffect(() => {
    const filters: TeamFilters = {};
    if (search.trim()) filters.search = search.trim();
    if (course.trim()) filters.course = course.trim();
    if (areaId !== ALL_VALUE) filters.areaId = Number(areaId);
    if (taskStatus !== ALL_VALUE) filters.taskStatus = taskStatus as TaskStatus;
    if (mentorId !== ALL_VALUE) filters.mentorId = mentorId;
    if (cohort !== ALL_VALUE) filters.cohort = cohort;

    let cancelled = false;
    // setIsLoading(true) fica dentro do .then (não direto no corpo do
    // effect) pra não disparar um setState síncrono durante o commit.
    Promise.resolve().then(async () => {
      if (cancelled) return;
      setIsLoading(true);
      const loaded = await getTeamsByStage(filters);
      if (cancelled) return;
      setTeams(loaded);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [search, course, areaId, taskStatus, mentorId, cohort]);

  if (sessionLoading) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">Carregando…</p>;
  }

  if (user?.role !== UserRole.ADMIN && user?.role !== UserRole.MENTOR) {
    return (
      <p className="px-6 py-8 text-sm text-muted-foreground">
        Esta área é exclusiva para administradores e mentores.
      </p>
    );
  }

  const teamsByStage = new Map<number, TeamBoardItem[]>();
  for (const team of teams) {
    const list = teamsByStage.get(team.currentStageId) ?? [];
    list.push(team);
    teamsByStage.set(team.currentStageId, list);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Funil de equipes</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Carregando…" : `${teams.length} equipe(s) encontrada(s)`}
          </p>
        </div>
        <ExportTeamsCsvButton teams={teams} />
      </div>

      <TeamFiltersBar
        search={search}
        onSearchChange={setSearch}
        course={course}
        onCourseChange={setCourse}
        areaId={areaId}
        onAreaIdChange={setAreaId}
        areas={areas}
        taskStatus={taskStatus}
        onTaskStatusChange={setTaskStatus}
        mentorId={mentorId}
        onMentorIdChange={setMentorId}
        mentors={mentors}
        cohort={cohort}
        onCohortChange={setCohort}
        cohorts={cohorts}
      />

      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageTeams = teamsByStage.get(stage.id) ?? [];
          return (
            <div key={stage.id} className="flex w-72 shrink-0 flex-col gap-3">
              <div className="flex items-center justify-between rounded-md bg-neutral-100 px-3 py-2">
                <span className="text-sm font-semibold">{stage.name}</span>
                <Badge variant="secondary">{stageTeams.length}</Badge>
              </div>
              <div className="flex flex-col gap-3">
                {stageTeams.map((team) => (
                  <TeamBoardCard key={team.id} team={team} />
                ))}
                {stageTeams.length === 0 && !isLoading && (
                  <p className="px-1 text-xs text-muted-foreground">Nenhuma equipe aqui.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
