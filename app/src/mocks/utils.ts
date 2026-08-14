/** Data relativa a "agora", em dias (negativo = passado). Usado para os
 * mocks nascerem sempre coerentes (ex.: uma tarefa "atrasada" continua
 * atrasada não importa quando você rodar o projeto). */
export function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/** Id legível para registros criados em runtime pelos services (mutações
 * no mock em memória) — mesmo formato dos ids fixos do dataset inicial. */
export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
