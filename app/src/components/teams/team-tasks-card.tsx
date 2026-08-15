import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { JourneyStage, TaskWithDetails, TeamDetail } from "@/types";
import { NewTaskForm } from "./new-task-form";
import { TaskReviewItem } from "./task-review-item";

/** Lista de tarefas da equipe (RF-08, RF-11 a RF-16), com formulário de
 * criação de nova tarefa ao final para admin/mentor. */
export function TeamTasksCard({
  team,
  tasks,
  stages,
  isStaff,
  createdById,
  onReload,
}: {
  team: TeamDetail;
  tasks: TaskWithDetails[];
  stages: JourneyStage[];
  isStaff: boolean;
  createdById: string;
  onReload: () => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarefas e entregas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa atribuída ainda.</p>
        )}
        {tasks.map((task) => (
          <TaskReviewItem
            key={task.id}
            task={task}
            isStaff={isStaff}
            onReviewed={onReload}
            onUpdated={onReload}
          />
        ))}
        {isStaff && (
          <NewTaskForm
            teamId={team.id}
            currentStageId={team.currentStageId}
            stages={stages}
            createdById={createdById}
            onCreated={onReload}
          />
        )}
      </CardContent>
    </Card>
  );
}
