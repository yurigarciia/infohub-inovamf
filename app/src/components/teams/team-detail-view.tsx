"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  IDEA_MATURITY_LABELS,
  REVIEW_STATUS_LABELS,
  TASK_STATUS_LABELS,
  TEAM_MEMBER_ROLE_LABELS,
} from "@/lib/labels";
import { useSession } from "@/lib/session";
import {
  addTeamNote,
  advanceTeamStage,
  getJourneyStages,
  getTeamDetail,
  getTasksForTeam,
  reviewSubmission,
} from "@/services";
import { ReviewStatus, TaskStatus, UserRole } from "@/types";
import type { JourneyStage, TaskSubmissionWithUsers, TaskWithDetails, TeamDetail } from "@/types";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    date,
  );
}

function taskStatusVariant(status: TaskStatus): "default" | "secondary" | "destructive" {
  if (status === TaskStatus.APPROVED) return "default";
  if (status === TaskStatus.LATE || status === TaskStatus.REJECTED) return "destructive";
  return "secondary";
}

export function TeamDetailView({ teamId }: { teamId: string }) {
  const { user, isLoading: sessionLoading } = useSession();
  const [team, setTeam] = useState<TeamDetail | null | undefined>(undefined);
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [stages, setStages] = useState<JourneyStage[]>([]);
  const [noteContent, setNoteContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
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
    return (
      <p className="px-6 py-8 text-sm text-destructive">
        Você não tem acesso a esta equipe.
      </p>
    );
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

  async function handleAddNote() {
    if (!user || !noteContent.trim()) return;
    setIsSavingNote(true);
    try {
      await addTeamNote(team!.id, user.id, noteContent.trim());
      setNoteContent("");
      await reload();
    } finally {
      setIsSavingNote(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground">
          ← Voltar ao funil
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{team.ideaName}</h1>
            {team.isReadyForInovamf && (
              <Badge className="bg-brand-600 text-white">Pronta p/ InovAMF</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Turma {team.cohort} · Etapa atual: {team.currentStage.name}
          </p>
        </div>
        {isStaff && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isChangingStage || team.currentStage.number <= 1}
              onClick={() => handleAdvance(-1)}
            >
              Retroceder etapa
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isChangingStage || team.currentStage.number >= 6}
              onClick={() => handleAdvance(1)}
            >
              Avançar etapa
            </Button>
          </div>
        )}
      </div>
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados cadastrais</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div>
              <span className="font-medium">Descrição: </span>
              <span className="text-muted-foreground">{team.ideaDescription}</span>
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <span className="font-medium">Área: </span>
                <span className="text-muted-foreground">{team.area?.name ?? "—"}</span>
              </div>
              <div>
                <span className="font-medium">Estágio da ideia: </span>
                <span className="text-muted-foreground">
                  {IDEA_MATURITY_LABELS[team.ideaMaturity]}
                </span>
              </div>
              <div>
                <span className="font-medium">Origem: </span>
                <span className="text-muted-foreground">{team.sourceOrigin ?? "—"}</span>
              </div>
            </div>
            <div>
              <span className="font-medium">Cadastrada em: </span>
              <span className="text-muted-foreground">{formatDate(team.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipe</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <div>
              <p className="mb-1 font-medium">Integrantes</p>
              <ul className="flex flex-col gap-0.5 text-muted-foreground">
                {team.members.map((member) => (
                  <li key={member.id}>
                    {member.user.name} — {member.user.email}
                    <span className="ml-1 text-xs uppercase text-brand-700">
                      {TEAM_MEMBER_ROLE_LABELS[member.memberRole]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 font-medium">Mentores</p>
              {team.mentors.length === 0 ? (
                <p className="text-muted-foreground">Nenhum mentor atribuído ainda.</p>
              ) : (
                <ul className="flex flex-col gap-0.5 text-muted-foreground">
                  {team.mentors.map((tm) => (
                    <li key={tm.id}>{tm.mentor.name}</li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de etapas</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2 text-sm">
              {team.stageHistory.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-2">
                  <span>
                    {stages.find((s) => s.id === entry.stageId)?.name ?? `Etapa ${entry.stageId}`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(entry.enteredAt)}
                    {entry.exitedAt ? ` – ${formatDate(entry.exitedAt)}` : " – atual"}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarefas e entregas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {tasks.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa atribuída ainda.</p>
            )}
            {tasks.map((task) => (
              <TaskReviewItem key={task.id} task={task} isStaff={isStaff} onReviewed={reload} />
            ))}
          </CardContent>
        </Card>

        {isStaff && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Anotações internas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-xs text-muted-foreground">
                Visível só para admin/mentor — nunca aparece na área do aluno (RF-10).
              </p>
              {team.notes.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma anotação ainda.</p>
              )}
              <ul className="flex flex-col gap-2 text-sm">
                {team.notes.map((note) => (
                  <li key={note.id} className="rounded-md bg-neutral-100 p-2">
                    <p>{note.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {note.author.name} — {formatDate(note.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2">
                <Textarea
                  rows={3}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Registrar anotação sobre esta equipe…"
                />
                <Button
                  type="button"
                  size="sm"
                  className="self-start"
                  disabled={isSavingNote || !noteContent.trim()}
                  onClick={handleAddNote}
                >
                  {isSavingNote ? "Salvando…" : "Adicionar anotação"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/** Uma tarefa dentro da página de detalhe da equipe, com aprovação/
 * reprovação de entrega inline (RF-15) e histórico de versões (RF-16). */
function TaskReviewItem({
  task,
  isStaff,
  onReviewed,
}: {
  task: TaskWithDetails;
  isStaff: boolean;
  onReviewed: () => Promise<void>;
}) {
  const { user } = useSession();
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

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

  return (
    <div className="rounded-md border border-border p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{task.title}</span>
        <Badge variant={taskStatusVariant(task.status)}>{TASK_STATUS_LABELS[task.status]}</Badge>
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
    </div>
  );
}
