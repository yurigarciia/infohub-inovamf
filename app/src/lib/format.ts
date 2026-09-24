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

/**
 * Prazo de tarefa é uma DATA (sem hora nem fuso). A API manda "AAAA-MM-DD"; aqui vira
 * um Date à meia-noite LOCAL, para `formatDate` mostrar exatamente o dia — parsear como
 * UTC (`new Date("2030-06-15")`) mostraria o dia anterior em horário de Brasília.
 * Aceita também um ISO completo (usa só os 10 primeiros caracteres).
 */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

/** Date local -> "AAAA-MM-DD" (pelos componentes locais, sem passar por UTC). */
export function toDateOnlyString(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** `yyyy-MM-dd` para popular um `<input type="date">` a partir de um Date. */
export function toDateInputValue(date: Date): string {
  return toDateOnlyString(date);
}

/** Cor do badge de status de tarefa — mesma regra usada no detalhe da
 * equipe e na área do aluno. */
export function taskStatusVariant(status: TaskStatus): "default" | "secondary" | "destructive" {
  if (status === TaskStatus.APPROVED) return "default";
  if (status === TaskStatus.LATE || status === TaskStatus.REJECTED) return "destructive";
  return "secondary";
}
