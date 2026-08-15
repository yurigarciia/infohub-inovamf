import Image from "next/image";

/** Rodapé institucional da landing — identidade do InfoHub, não do
 * InovAMF: o InfoHub é o laboratório de empreendedorismo da própria
 * Faculdade Antonio Meneghetti (AMF) que prepara alunos/equipes
 * antes de encaminhá-los ao centro de inovação InovAMF (entidades
 * distintas, ver docs/Infohub_InovAMF_Requisitos.md). */
export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-neutral-50 px-6 py-10 text-center">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-2">
        <Image src="/logotipo.png" alt="InfoHub" width={28} height={28} className="h-7 w-7" />
        <p className="text-sm font-medium">InfoHub — Faculdade Antonio Meneghetti (AMF)</p>
        <p className="text-sm text-muted-foreground">
          Laboratório de empreendedorismo que prepara alunos e equipes para o InovAMF.
        </p>
      </div>
    </footer>
  );
}
