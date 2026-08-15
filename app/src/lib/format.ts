import { TaskStatus } from "@/types";

/** Formato de data curto (pt-BR), usado em todas as telas que exibem
 * datas de tarefa/equipe/lembrete/auditoria. */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** Formato de data + hora (pt-BR), usado na trilha de auditoria. */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** `yyyy-MM-dd` para popular um `<input type="date">` a partir de um Date. */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Cor do badge de status de tarefa — mesma regra usada no detalhe da
 * equipe e na área do aluno. */
export function taskStatusVariant(status: TaskStatus): "default" | "secondary" | "destructive" {
  if (status === TaskStatus.APPROVED) return "default";
  if (status === TaskStatus.LATE || status === TaskStatus.REJECTED) return "destructive";
  return "secondary";
}
