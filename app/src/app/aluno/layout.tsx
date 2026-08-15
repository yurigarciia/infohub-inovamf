import { AlunoSidebar } from "@/components/aluno/aluno-sidebar";

/** Layout da área do aluno — sidebar fixa + conteúdo, espelhando a
 * área administrativa (T-FE-18). A guarda de papel continua em cada
 * página (a sidebar é só chrome de navegação). */
export default function AlunoLayout({ children }: LayoutProps<"/aluno">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <AlunoSidebar />
      <div className="flex flex-1 flex-col overflow-x-hidden bg-neutral-50">{children}</div>
    </div>
  );
}
