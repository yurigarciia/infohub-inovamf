/** Rodapé institucional da landing — localização e instituições
 * fundadoras do InovAMF, pra dar credibilidade a quem chega sem
 * contexto nenhum sobre o programa. */
export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-neutral-50 px-6 py-10 text-center">
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        <p className="text-sm font-medium">Antonio Meneghetti Faculdade & Fundação Antonio Meneghetti</p>
        <p className="text-sm text-muted-foreground">
          Centro Internacional de Arte e Cultura Humanista Recanto Maestro — São João do Polêsine /
          Restinga Sêca, RS
        </p>
      </div>
    </footer>
  );
}
