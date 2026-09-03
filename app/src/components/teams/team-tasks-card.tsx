import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PENDING_TASK_STATUSES } from "@/lib/task-status";
import type { JourneyStage, TaskWithDetails, TeamDetail } from "@/types";
import { NewTaskForm } from "./new-task-form";
import { TaskReviewItem } from "./task-review-item";

/** Lista de tarefas da equipe (RF-08, RF-11 a RF-16), separadas em
 * pendentes e concluídas (mesmo agrupamento da área do aluno, T-FE-30
 * — antes era uma lista só, difícil de escanear quando a equipe tem
 * várias tarefas), com formulário de criação de nova tarefa ao final
 * para admin/mentor. */
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
  const pendingTasks = tasks.filter((t) => PENDING_TASK_STATUSES.includes(t.status));
  const doneTasks = tasks.filter((t) => !PENDING_TASK_STATUSES.includes(t.status));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarefas e entregas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa atribuída ainda.</p>
        )}

        {tasks.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Pendentes ({pendingTasks.length})
            </h3>
            {pendingTasks.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente.</p>
            )}
            {pendingTasks.map((task) => (
              <TaskReviewItem
                key={task.id}
                task={task}
                isStaff={isStaff}
                onReviewed={onReload}
                onUpdated={onReload}
              />
            ))}
          </div>
        )}

        {doneTasks.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Concluídas ({doneTasks.length})
            </h3>
            {doneTasks.map((task) => (
              <TaskReviewItem
                key={task.id}
                task={task}
                isStaff={isStaff}
                onReviewed={onReload}
                onUpdated={onReload}
              />
            ))}
          </div>
        )}

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
