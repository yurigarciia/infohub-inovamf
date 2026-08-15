"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getIdeaAreas,
  getJourneyStages,
  getMentors,
  getTeamsByStage,
} from "@/services";
import { downloadTextFile, toCsv } from "@/lib/csv";
import { IDEA_MATURITY_LABELS, TASK_STATUS_LABELS } from "@/lib/labels";
import { TaskStatus, TeamMemberRole } from "@/types";
import type { IdeaArea, JourneyStage, TeamBoardItem, TeamFilters, User } from "@/types";

const ALL_VALUE = "__all__";

/** Painel do administrador/mentor — funil/kanban (RF-06, RF-07). */
export default function AdminHomePage() {
  const [stages, setStages] = useState<JourneyStage[]>([]);
  const [areas, setAreas] = useState<IdeaArea[]>([]);
  const [mentors, setMentors] = useState<User[]>([]);
  const [teams, setTeams] = useState<TeamBoardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [course, setCourse] = useState("");
  const [areaId, setAreaId] = useState<string>(ALL_VALUE);
  const [taskStatus, setTaskStatus] = useState<string>(ALL_VALUE);
  const [mentorId, setMentorId] = useState<string>(ALL_VALUE);

  useEffect(() => {
    Promise.all([getJourneyStages(), getIdeaAreas(), getMentors()]).then(
      ([loadedStages, loadedAreas, loadedMentors]) => {
        setStages(loadedStages);
        setAreas(loadedAreas);
        setMentors(loadedMentors);
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
  }, [search, course, areaId, taskStatus, mentorId]);

  const teamsByStage = new Map<number, TeamBoardItem[]>();
  for (const team of teams) {
    const list = teamsByStage.get(team.currentStageId) ?? [];
    list.push(team);
    teamsByStage.set(team.currentStageId, list);
  }

  function handleExportCsv() {
    const headers = [
      "Nome da ideia",
      "Área",
      "Etapa atual",
      "Turma",
      "Estágio da ideia",
      "Pronta para o InovAMF",
      "Líder",
      "E-mail do líder",
      "Integrantes",
    ];
    const rows = teams.map((team) => {
      const leader = team.members.find((m) => m.memberRole === TeamMemberRole.LEADER);
      const others = team.members
        .filter((m) => m.memberRole !== TeamMemberRole.LEADER)
        .map((m) => m.user.name)
        .join("; ");
      return {
        "Nome da ideia": team.ideaName,
        Área: team.area?.name ?? "",
        "Etapa atual": team.currentStage.name,
        Turma: team.cohort,
        "Estágio da ideia": IDEA_MATURITY_LABELS[team.ideaMaturity],
        "Pronta para o InovAMF": team.isReadyForInovamf ? "Sim" : "Não",
        Líder: leader?.user.name ?? "",
        "E-mail do líder": leader?.user.email ?? "",
        Integrantes: others,
      };
    });
    const csv = toCsv(rows, headers);
    const today = new Date().toISOString().slice(0, 10);
    downloadTextFile(`infohub-equipes-${today}.csv`, csv);
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
        <Button type="button" variant="outline" size="sm" disabled={teams.length === 0} onClick={handleExportCsv}>
          Exportar CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="search" className="text-xs font-medium text-muted-foreground">
            Buscar por nome da ideia
          </label>
          <Input
            id="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ex.: EstudaFácil"
            className="w-56"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="course" className="text-xs font-medium text-muted-foreground">
            Curso
          </label>
          <Input
            id="course"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            placeholder="ex.: Sistemas de Informação"
            className="w-56"
          />
        </div>
        <FilterSelect
          label="Área"
          value={areaId}
          onChange={setAreaId}
          placeholder="Todas"
          options={areas.map((area) => ({ value: String(area.id), label: area.name }))}
        />
        <FilterSelect
          label="Status de tarefa"
          value={taskStatus}
          onChange={setTaskStatus}
          placeholder="Todos"
          options={Object.values(TaskStatus).map((status) => ({
            value: status,
            label: TASK_STATUS_LABELS[status],
          }))}
        />
        <FilterSelect
          label="Mentor responsável"
          value={mentorId}
          onChange={setMentorId}
          placeholder="Todos"
          options={mentors.map((mentor) => ({ value: mentor.id, label: mentor.name }))}
        />
      </div>

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
                  <TeamCard key={team.id} team={team} />
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

function FilterSelect({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={(next) => onChange(next ?? ALL_VALUE)}>
        <SelectTrigger className="w-48">
          <SelectValue>
            {() =>
              value === ALL_VALUE ? placeholder : (options.find((o) => o.value === value)?.label ?? placeholder)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TeamCard({ team }: { team: TeamBoardItem }) {
  return (
    <Link
      href={`/admin/equipes/${team.id}`}
      className="block rounded-lg border border-border bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="text-sm font-semibold leading-tight">{team.ideaName}</span>
        {team.isReadyForInovamf && (
          <Badge className="shrink-0 bg-brand-600 text-white">Pronta p/ InovAMF</Badge>
        )}
      </div>
      {team.area && (
        <Badge variant="secondary" className="mb-2">
          {team.area.name}
        </Badge>
      )}
      <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        {team.members.map((member) => (
          <li key={member.id}>
            {member.user.name}
            {member.memberRole === TeamMemberRole.LEADER && (
              <span className="ml-1 text-[10px] uppercase text-brand-700">líder</span>
            )}
          </li>
        ))}
      </ul>
    </Link>
  );
}
