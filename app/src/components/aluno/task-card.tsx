"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { REVIEW_STATUS_LABELS, TASK_STATUS_LABELS } from "@/lib/labels";
import { formatDate, taskStatusVariant } from "@/lib/format";
import { PENDING_TASK_STATUSES } from "@/lib/task-status";
import type { TaskSubmissionWithUsers, TaskWithTeam } from "@/types";
import { TaskSubmissionForm } from "./task-submission-form";

/** Uma tarefa na área do aluno (RF-13): linha resumo clicável (nome,
 * equipe, prazo, status) que abre um dialog com os detalhes completos
 * — descrição/instruções, histórico de entregas com link e comentário
 * do mentor — e o envio de entrega quando ainda pendente (T-FE-34,
 * mesmo padrão de dialog já usado na tela de equipe do admin/mentor). */
export function TaskCard({
  task,
  studentId,
  onSubmitted,
}: {
  task: TaskWithTeam;
  studentId: string;
  onSubmitted: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const canSubmit = PENDING_TASK_STATUSES.includes(task.status);
  const currentSubmission = task.submissions.find((s) => s.isCurrent);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-white p-3 text-left transition-colors hover:bg-neutral-50">
        <div>
          <p className="text-sm font-medium">{task.title}</p>
          <p className="text-xs text-muted-foreground">
            {task.team.ideaName} · Prazo: {formatDate(task.dueDate)}
          </p>
        </div>
        <Badge variant={taskStatusVariant(task.status)}>{TASK_STATUS_LABELS[task.status]}</Badge>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <div className="flex items-start justify-between gap-2 pr-6">
            <DialogTitle>{task.title}</DialogTitle>
            <Badge variant={taskStatusVariant(task.status)}>{TASK_STATUS_LABELS[task.status]}</Badge>
          </div>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          {task.team.ideaName} · Prazo: {formatDate(task.dueDate)}
        </p>

        {task.description && <p className="text-sm">{task.description}</p>}

        {task.submissions.length > 0 && (
          <ul className="flex flex-col gap-1 text-xs">
            {task.submissions.map((submission: TaskSubmissionWithUsers) => (
              <li key={submission.id} className="flex items-center justify-between gap-2">
                <a
                  href={submission.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-brand-700 underline underline-offset-2"
                >
                  v{submission.version}
                  {submission.isExternalLink ? " (link)" : ""}
                </a>
                <span className="shrink-0 text-muted-foreground">
                  {REVIEW_STATUS_LABELS[submission.reviewStatus]}
                </span>
              </li>
            ))}
          </ul>
        )}

        {currentSubmission?.reviewComment && (
          <p className="rounded-md bg-neutral-100 p-2 text-sm">
            <span className="font-medium">Comentário do mentor: </span>
            {currentSubmission.reviewComment}
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
              setIsOpen(false);
              onSubmitted();
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
