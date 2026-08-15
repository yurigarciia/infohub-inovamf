"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { REVIEW_STATUS_LABELS, TASK_STATUS_LABELS } from "@/lib/labels";
import { formatDate, taskStatusVariant, toDateInputValue } from "@/lib/format";
import { useSession } from "@/lib/session";
import { reviewSubmission, updateTask } from "@/services";
import { ReviewStatus } from "@/types";
import type { TaskSubmissionWithUsers, TaskWithDetails } from "@/types";
import { ReminderSection } from "./reminder-section";

/** Uma tarefa dentro da página de detalhe da equipe, com aprovação/
 * reprovação de entrega inline (RF-15), histórico de versões (RF-16)
 * e edição de título/descrição/prazo (RF-12). */
export function TaskReviewItem({
  task,
  isStaff,
  onReviewed,
  onUpdated,
}: {
  task: TaskWithDetails;
  isStaff: boolean;
  onReviewed: () => Promise<void>;
  onUpdated: () => Promise<void>;
}) {
  const { user } = useSession();
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description ?? "");
  const [editDueDate, setEditDueDate] = useState(toDateInputValue(task.dueDate));
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const currentSubmission = task.submissions.find((s) => s.isCurrent);
  const canReview = isStaff && currentSubmission?.reviewStatus === ReviewStatus.PENDING;

  async function handleReview(decision: typeof ReviewStatus.APPROVED | typeof ReviewStatus.REJECTED) {
    if (!user || !currentSubmission) return;
    if (decision === ReviewStatus.REJECTED && !rejectComment.trim()) {
      setReviewError("Informe um comentário explicando o motivo da reprovação.");
      return;
    }
    setReviewError(null);
    setIsSubmittingReview(true);
    try {
      await reviewSubmission({
        submissionId: currentSubmission.id,
        reviewedById: user.id,
        decision,
        reviewComment: decision === ReviewStatus.REJECTED ? rejectComment.trim() : undefined,
      });
      setIsRejecting(false);
      setRejectComment("");
      await onReviewed();
    } finally {
      setIsSubmittingReview(false);
    }
  }

  async function handleSaveEdit() {
    setIsSavingEdit(true);
    try {
      await updateTask({
        taskId: task.id,
        title: editTitle.trim(),
        description: editDescription.trim(),
        dueDate: new Date(`${editDueDate}T00:00:00`),
      });
      setIsEditing(false);
      await onUpdated();
    } finally {
      setIsSavingEdit(false);
    }
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
        <Textarea
          rows={2}
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
        />
        <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            disabled={isSavingEdit || !editTitle.trim()}
            onClick={handleSaveEdit}
          >
            {isSavingEdit ? "Salvando…" : "Salvar"}
          </Button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{task.title}</span>
        <div className="flex items-center gap-2">
          <Badge variant={taskStatusVariant(task.status)}>{TASK_STATUS_LABELS[task.status]}</Badge>
          {isStaff && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Editar
            </button>
          )}
        </div>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">Prazo: {formatDate(task.dueDate)}</p>

      {task.submissions.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1 text-xs">
          {task.submissions.map((submission: TaskSubmissionWithUsers) => (
            <li key={submission.id} className="flex items-center justify-between gap-2">
              <a
                href={submission.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate text-brand-700 underline underline-offset-2"
              >
                v{submission.version} — {submission.submittedBy.name}
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
        <p className="mb-2 rounded-md bg-neutral-100 p-2 text-xs">
          <span className="font-medium">Comentário: </span>
          {currentSubmission.reviewComment}
        </p>
      )}

      {canReview && !isRejecting && (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            disabled={isSubmittingReview}
            onClick={() => handleReview(ReviewStatus.APPROVED)}
          >
            Aprovar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isSubmittingReview}
            onClick={() => setIsRejecting(true)}
          >
            Reprovar
          </Button>
        </div>
      )}

      {canReview && isRejecting && (
        <div className="flex flex-col gap-2">
          <Textarea
            rows={2}
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder="O que precisa ser ajustado?"
          />
          {reviewError && <p className="text-xs text-destructive">{reviewError}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={isSubmittingReview}
              onClick={() => handleReview(ReviewStatus.REJECTED)}
            >
              {isSubmittingReview ? "Enviando…" : "Confirmar reprovação"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setIsRejecting(false);
                setReviewError(null);
              }}
              className="text-xs text-muted-foreground underline underline-offset-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isStaff && <ReminderSection task={task} onChanged={onUpdated} />}
    </div>
  );
}
