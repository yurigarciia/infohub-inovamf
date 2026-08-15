import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/filters/filter-select";
import { TASK_STATUS_LABELS } from "@/lib/labels";
import { TaskStatus } from "@/types";
import type { IdeaArea, User } from "@/types";

/** Barra de filtros do painel do admin (RF-07, RF-24): busca, curso,
 * área, status de tarefa, mentor responsável e turma. */
export function TeamFiltersBar({
  search,
  onSearchChange,
  course,
  onCourseChange,
  areaId,
  onAreaIdChange,
  areas,
  taskStatus,
  onTaskStatusChange,
  mentorId,
  onMentorIdChange,
  mentors,
  cohort,
  onCohortChange,
  cohorts,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  course: string;
  onCourseChange: (value: string) => void;
  areaId: string;
  onAreaIdChange: (value: string) => void;
  areas: IdeaArea[];
  taskStatus: string;
  onTaskStatusChange: (value: string) => void;
  mentorId: string;
  onMentorIdChange: (value: string) => void;
  mentors: User[];
  cohort: string;
  onCohortChange: (value: string) => void;
  cohorts: string[];
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="search" className="text-xs font-medium text-muted-foreground">
          Buscar por nome da ideia
        </label>
        <Input
          id="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
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
          onChange={(e) => onCourseChange(e.target.value)}
          placeholder="ex.: Sistemas de Informação"
          className="w-56"
        />
      </div>
      <FilterSelect
        label="Área"
        value={areaId}
        onChange={onAreaIdChange}
        placeholder="Todas"
        options={areas.map((area) => ({ value: String(area.id), label: area.name }))}
      />
      <FilterSelect
        label="Status de tarefa"
        value={taskStatus}
        onChange={onTaskStatusChange}
        placeholder="Todos"
        options={Object.values(TaskStatus).map((status) => ({
          value: status,
          label: TASK_STATUS_LABELS[status],
        }))}
      />
      <FilterSelect
        label="Mentor responsável"
        value={mentorId}
        onChange={onMentorIdChange}
        placeholder="Todos"
        options={mentors.map((mentor) => ({ value: mentor.id, label: mentor.name }))}
      />
      <FilterSelect
        label="Turma"
        value={cohort}
        onChange={onCohortChange}
        placeholder="Todas"
        options={cohorts.map((c) => ({ value: c, label: c }))}
      />
    </div>
  );
}
