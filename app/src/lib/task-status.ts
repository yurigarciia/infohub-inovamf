import { TaskStatus } from "@/types";

/** Status que ainda exigem ação do aluno (aparecem em "Pendentes" na
 * área do aluno, RF-13, e habilitam o envio de entrega). REJECTED entra
 * aqui porque a tarefa foi reaberta e precisa de reenvio. */
export const PENDING_TASK_STATUSES: TaskStatus[] = [
  TaskStatus.PENDING,
  TaskStatus.IN_PROGRESS,
  TaskStatus.LATE,
  TaskStatus.REJECTED,
];
