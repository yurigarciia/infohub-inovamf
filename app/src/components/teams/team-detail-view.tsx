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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  configureReminder,
  createTask,
  getJourneyStages,
  getTaskTemplates,
  getTeamDetail,
  getTasksForTeam,
  reviewSubmission,
  sendManualReminder,
  updateTask,
} from "@/services";
import { ReviewStatus, TaskStatus, UserRole } from "@/types";
import type {
  JourneyStage,
  TaskSubmissionWithUsers,
  TaskTemplate,
  TaskWithDetails,
  TeamDetail,
} from "@/types";

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
              <TaskReviewItem
                key={task.id}
                task={task}
                isStaff={isStaff}
                onReviewed={reload}
                onUpdated={reload}
              />
            ))}
            {isStaff && (
              <NewTaskForm
                teamId={team.id}
                currentStageId={team.currentStageId}
                stages={stages}
                createdById={user!.id}
                onCreated={reload}
              />
            )}
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

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Uma tarefa dentro da página de detalhe da equipe, com aprovação/
 * reprovação de entrega inline (RF-15), histórico de versões (RF-16)
 * e edição de título/descrição/prazo (RF-12). */
function TaskReviewItem({
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
        <Input
          type="date"
          value={editDueDate}
          onChange={(e) => setEditDueDate(e.target.value)}
        />
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

/** Lembretes de uma tarefa (RF-17, RF-20) — configurar data automática
 * ou disparar um lembrete manual avulso agora. O envio de fato (job
 * varrendo tarefas na data configurada) é trabalho de backend; aqui só
 * registra a configuração/disparo. */
function ReminderSection({
  task,
  onChanged,
}: {
  task: TaskWithDetails;
  onChanged: () => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [remindAt, setRemindAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingManual, setIsSendingManual] = useState(false);

  async function handleConfigure() {
    if (!remindAt) return;
    setIsSaving(true);
    try {
      await configureReminder(task.id, new Date(`${remindAt}T09:00:00`));
      setRemindAt("");
      setIsOpen(false);
      await onChanged();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendManual() {
    setIsSendingManual(true);
    try {
      await sendManualReminder(task.id);
      await onChanged();
    } finally {
      setIsSendingManual(false);
    }
  }

  const lastReminder = [...task.reminders].sort(
    (a, b) => (b.sentAt?.getTime() ?? 0) - (a.sentAt?.getTime() ?? 0),
  )[0];

  return (
    <div className="mt-2 border-t border-border pt-2">
      {task.reminders.length > 0 && (
        <ul className="mb-2 flex flex-col gap-0.5 text-xs text-muted-foreground">
          {task.reminders.map((reminder) => (
            <li key={reminder.id}>
              {formatDate(reminder.remindAt)}
              {reminder.isManual ? " (manual)" : ""} —{" "}
              {reminder.sent ? `enviado em ${formatDate(reminder.sentAt!)}` : "agendado"}
            </li>
          ))}
        </ul>
      )}
      {lastReminder?.sent && (
        <p className="mb-2 text-xs text-muted-foreground">
          Último lembrete enviado: {formatDate(lastReminder.sentAt!)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isSendingManual}
          onClick={handleSendManual}
        >
          {isSendingManual ? "Enviando…" : "Enviar lembrete agora"}
        </Button>
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Configurar lembrete automático
          </button>
        )}
        {isOpen && (
          <>
            <Input
              type="date"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
              className="w-40"
            />
            <Button type="button" size="sm" disabled={isSaving || !remindAt} onClick={handleConfigure}>
              {isSaving ? "Salvando…" : "Salvar"}
            </Button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-muted-foreground underline underline-offset-2"
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Formulário de criação de tarefa (RF-11, RF-12) — avulsa ou a partir
 * de um template pré-configurado por etapa. */
function NewTaskForm({
  teamId,
  currentStageId,
  stages,
  createdById,
  onCreated,
}: {
  teamId: string;
  currentStageId: number;
  stages: JourneyStage[];
  createdById: string;
  onCreated: () => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [stageId, setStageId] = useState(String(currentStageId));
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    getTaskTemplates(Number(stageId)).then(setTemplates);
  }, [isOpen, stageId]);

  function applyTemplate(nextTemplateId: string) {
    setTemplateId(nextTemplateId);
    const template = templates.find((t) => t.id === nextTemplateId);
    if (template) {
      setTitle(template.title);
      setDescription(template.description ?? "");
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!title.trim()) {
      setError("Dê um título para a tarefa.");
      return;
    }
    if (!dueDate) {
      setError("Defina um prazo.");
      return;
    }
    setIsSaving(true);
    try {
      await createTask({
        teamId,
        stageId: Number(stageId),
        templateId: templateId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: new Date(`${dueDate}T00:00:00`),
        createdById,
      });
      setIsOpen(false);
      setTemplateId("");
      setTitle("");
      setDescription("");
      setDueDate("");
      await onCreated();
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return (
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setIsOpen(true)}>
        Nova tarefa
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-task-stage">Etapa</Label>
          <Select value={stageId} onValueChange={(v) => v && setStageId(v)}>
            <SelectTrigger id="new-task-stage" className="w-full">
              <SelectValue>
                {() => stages.find((s) => String(s.id) === stageId)?.name ?? "Selecione"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={String(stage.id)}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-task-template">Modelo (opcional)</Label>
          <Select value={templateId || "__none__"} onValueChange={(v) => applyTemplate(v === "__none__" ? "" : (v ?? ""))}>
            <SelectTrigger id="new-task-template" className="w-full">
              <SelectValue>
                {() => templates.find((t) => t.id === templateId)?.title ?? "Tarefa avulsa"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Tarefa avulsa</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-task-title">Título</Label>
        <Input id="new-task-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-task-description">Descrição/instruções</Label>
        <Textarea
          id="new-task-description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-task-due-date">Prazo</Label>
        <Input
          id="new-task-due-date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-48"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={isSaving} onClick={handleSubmit}>
          {isSaving ? "Criando…" : "Criar tarefa"}
        </Button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-xs text-muted-foreground underline underline-offset-2"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
