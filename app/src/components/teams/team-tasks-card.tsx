import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PENDING_TASK_STATUSES } from "@/lib/task-status";
import { TaskStatus } from "@/types";
import type { JourneyStage, TaskWithDetails, TeamDetail } from "@/types";
import { NewTaskForm } from "./new-task-form";
import { TaskReviewItem } from "./task-review-item";

/** Lista de tarefas da equipe (RF-08, RF-11 a RF-16), separada em três
 * grupos (T-FE-30/T-FE-32): "Pendentes" (o aluno ainda precisa entregar
 * ou reenviar), "Aguardando avaliação do InfoHub" (SUBMITTED — já
 * entregue, falta admin/mentor aprovar ou reprovar) e "Concluídas"
 * (APPROVED). Antes SUBMITTED caía junto com "Concluídas", escondendo
 * o que de fato precisava de ação da equipe InfoHub agora. Formulário
 * de nova tarefa ao final, só pra admin/mentor. */
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
  const awaitingReviewTasks = tasks.filter((t) => t.status === TaskStatus.SUBMITTED);
  const doneTasks = tasks.filter((t) => t.status === TaskStatus.APPROVED);

  const groups = [
    { label: "Pendentes", items: pendingTasks, emptyLabel: "Nenhuma tarefa pendente." },
    {
      label: "Aguardando avaliação do InfoHub",
      items: awaitingReviewTasks,
      emptyLabel: null,
    },
    { label: "Concluídas", items: doneTasks, emptyLabel: null },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarefas e entregas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa atribuída ainda.</p>
        )}

        {groups.map(
          (group) =>
            (group.items.length > 0 || group.emptyLabel) && (
              <div key={group.label} className="flex flex-col gap-3">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {group.label} ({group.items.length})
                </h3>
                {group.items.length === 0 && group.emptyLabel && (
                  <p className="text-sm text-muted-foreground">{group.emptyLabel}</p>
                )}
                {group.items.map((task) => (
                  <TaskReviewItem
                    key={task.id}
                    task={task}
                    isStaff={isStaff}
                    onReviewed={onReload}
                    onUpdated={onReload}
                  />
                ))}
              </div>
            ),
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
