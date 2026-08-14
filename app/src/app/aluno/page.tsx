"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { REVIEW_STATUS_LABELS, TASK_STATUS_LABELS } from "@/lib/labels";
import { useSession } from "@/lib/session";
import { getTasksForStudent, submitTask } from "@/services";
import { TaskStatus, UserRole } from "@/types";
import type { TaskWithTeam } from "@/types";

const PENDING_STATUSES: TaskStatus[] = [
  TaskStatus.PENDING,
  TaskStatus.IN_PROGRESS,
  TaskStatus.LATE,
  TaskStatus.REJECTED,
];

const ALLOWED_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg", "video/mp4"];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB — RNF-04

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

export default function AlunoHomePage() {
  const { user, isLoading: sessionLoading } = useSession();
  const [tasks, setTasks] = useState<TaskWithTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function reload(userId: string) {
    const loaded = await getTasksForStudent(userId);
    setTasks(loaded);
    setIsLoading(false);
  }

  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(() => reload(user.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (sessionLoading) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">Carregando…</p>;
  }

  if (!user) {
    return (
      <p className="px-6 py-8 text-sm text-muted-foreground">
        Faça login para ver suas tarefas.
      </p>
    );
  }

  if (user.role !== UserRole.STUDENT) {
    return (
      <p className="px-6 py-8 text-sm text-muted-foreground">
        Esta área é exclusiva para alunos.
      </p>
    );
  }

  const pendingTasks = tasks.filter((t) => PENDING_STATUSES.includes(t.status));
  const doneTasks = tasks.filter((t) => !PENDING_STATUSES.includes(t.status));

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold">Minhas tarefas</h1>
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Carregando…" : `${tasks.length} tarefa(s) no total`}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Pendentes</h2>
        {pendingTasks.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente. 🎉</p>
        )}
        {pendingTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            studentId={user.id}
            onSubmitted={() => reload(user.id)}
          />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Concluídas</h2>
        {doneTasks.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa concluída ainda.</p>
        )}
        {doneTasks.map((task) => (
          <TaskCard key={task.id} task={task} studentId={user.id} onSubmitted={() => reload(user.id)} />
        ))}
      </section>
    </div>
  );
}

function TaskCard({
  task,
  studentId,
  onSubmitted,
}: {
  task: TaskWithTeam;
  studentId: string;
  onSubmitted: () => void;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [mode, setMode] = useState<"file" | "link">("file");
  const [linkValue, setLinkValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = PENDING_STATUSES.includes(task.status);
  const currentSubmission = task.submissions.find((s) => s.isCurrent);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError("Tipo de arquivo não permitido. Envie PDF, imagem (PNG/JPEG) ou vídeo (MP4).");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`Arquivo muito grande (${(file.size / (1024 * 1024)).toFixed(1)} MB). Limite: 50 MB.`);
      event.target.value = "";
      return;
    }

    setIsSubmitting(true);
    try {
      const fileUrl = URL.createObjectURL(file);
      await submitTask({ taskId: task.id, submittedById: studentId, fileUrl, isExternalLink: false });
      setIsFormOpen(false);
      onSubmitted();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLinkSubmit() {
    setError(null);
    try {
      new URL(linkValue);
    } catch {
      setError("Informe uma URL válida (ex.: link do YouTube ou Google Drive).");
      return;
    }
    setIsSubmitting(true);
    try {
      await submitTask({
        taskId: task.id,
        submittedById: studentId,
        fileUrl: linkValue,
        isExternalLink: true,
      });
      setLinkValue("");
      setIsFormOpen(false);
      onSubmitted();
    } finally {
      setIsSubmitting(false);
    }
  }

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
          <div className="flex flex-col gap-3 rounded-md border border-border p-3">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "file" ? "default" : "outline"}
                onClick={() => setMode("file")}
              >
                Enviar arquivo
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "link" ? "default" : "outline"}
                onClick={() => setMode("link")}
              >
                Enviar link
              </Button>
            </div>

            {mode === "file" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`file-${task.id}`}>
                  Arquivo (PDF, imagem ou vídeo — até 50 MB)
                </Label>
                <Input
                  id={`file-${task.id}`}
                  type="file"
                  accept=".pdf,image/png,image/jpeg,video/mp4"
                  disabled={isSubmitting}
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`link-${task.id}`}>Link (ex.: Pitch Vídeo no YouTube/Drive)</Label>
                <div className="flex gap-2">
                  <Input
                    id={`link-${task.id}`}
                    type="url"
                    placeholder="https://…"
                    value={linkValue}
                    onChange={(e) => setLinkValue(e.target.value)}
                  />
                  <Button type="button" size="sm" disabled={isSubmitting} onClick={handleLinkSubmit}>
                    {isSubmitting ? "Enviando…" : "Enviar"}
                  </Button>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setError(null);
              }}
              className="self-start text-xs text-muted-foreground underline underline-offset-2"
            >
              Cancelar
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
