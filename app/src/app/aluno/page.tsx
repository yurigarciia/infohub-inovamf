"use client";

import { useEffect, useState } from "react";
import { TaskCard } from "@/components/aluno/task-card";
import { useSession } from "@/lib/session";
import { PENDING_TASK_STATUSES } from "@/lib/task-status";
import { getTasksForStudent } from "@/services";
import { UserRole } from "@/types";
import type { TaskWithTeam } from "@/types";

/** Área do aluno — lista de tarefas (RF-13), separadas em pendentes e
 * concluídas. Um aluno pode ter tarefas de mais de uma equipe (Q4). */
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
      <p className="px-6 py-8 text-sm text-muted-foreground">Faça login para ver suas tarefas.</p>
    );
  }

  if (user.role !== UserRole.STUDENT) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">Esta área é exclusiva para alunos.</p>;
  }

  const pendingTasks = tasks.filter((t) => PENDING_TASK_STATUSES.includes(t.status));
  const doneTasks = tasks.filter((t) => !PENDING_TASK_STATUSES.includes(t.status));

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
          <TaskCard key={task.id} task={task} studentId={user.id} onSubmitted={() => reload(user.id)} />
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
