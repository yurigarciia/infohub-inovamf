/** Simula a latência de uma chamada de rede real, para os componentes já
 * nascerem preparados para estado de loading (ver docs/frontend-plan.md,
 * Seção 4.1). Remover quando os services passarem a chamar a API real —
 * a latência real vai existir por conta própria. */
export function delay(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
