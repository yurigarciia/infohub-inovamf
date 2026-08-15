"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REVIEW_STATUS_LABELS, TASK_STATUS_LABELS } from "@/lib/labels";
import { formatDate, taskStatusVariant } from "@/lib/format";
import { PENDING_TASK_STATUSES } from "@/lib/task-status";
import type { TaskWithTeam } from "@/types";
import { TaskSubmissionForm } from "./task-submission-form";

/** Card de uma tarefa na área do aluno (RF-13), com envio de entrega
 * inline quando ela ainda está pendente. */
export function TaskCard({
  task,
  studentId,
  onSubmitted,
}: {
  task: TaskWithTeam;
  studentId: string;
  onSubmitted: () => void;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const canSubmit = PENDING_TASK_STATUSES.includes(task.status);
  const currentSubmission = task.submissions.find((s) => s.isCurrent);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{task.title}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {task.team.ideaName} · Prazo: {formatDate(task.dueDate)}
            </p>
          </div>
          <Badge variant={taskStatusVariant(task.status)}>{TASK_STATUS_LABELS[task.status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}

        {currentSubmission?.reviewComment && (
          <p className="rounded-md bg-neutral-100 p-2 text-sm">
            <span className="font-medium">Comentário do mentor: </span>
            {currentSubmission.reviewComment}
          </p>
        )}

        {currentSubmission && (
          <p className="text-xs text-muted-foreground">
            Última entrega: v{currentSubmission.version} —{" "}
            {REVIEW_STATUS_LABELS[currentSubmission.reviewStatus]}
          </p>
        )}

        {canSubmit && !isFormOpen && (
          <Button type="button" size="sm" className="self-start" onClick={() => setIsFormOpen(true)}>
            Enviar entrega
          </Button>
        )}

        {canSubmit && isFormOpen && (
          <TaskSubmissionForm
            taskId={task.id}
            studentId={studentId}
            onSubmitted={() => {
              setIsFormOpen(false);
              onSubmitted();
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}
