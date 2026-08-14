/** Data relativa a "agora", em dias (negativo = passado). Usado para os
 * mocks nascerem sempre coerentes (ex.: uma tarefa "atrasada" continua
 * atrasada não importa quando você rodar o projeto). */
export function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
