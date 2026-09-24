"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AlunoSidebar } from "@/components/aluno/aluno-sidebar";
import { RequireRole } from "@/components/auth/require-role";
import { useSession } from "@/lib/session";
import { UserRole } from "@/types";

/** Layout de `/equipes/[teamId]` — rota neutra (T-FE-20) acessada tanto
 * pelo admin/mentor quanto pelo aluno membro da equipe. Sem essa
 * sidebar, quem chegava aqui ficava sem navegação nenhuma pra sair da
 * tela além do botão "Voltar" (ver T-FE-29). Escolhe a sidebar pelo
 * papel da sessão — a guarda de acesso de verdade continua dentro de
 * `TeamDetailView` (RNF-03), isso aqui é só chrome de navegação. */
export default function EquipeDetailLayout({ children }: LayoutProps<"/equipes">) {
  const { user } = useSession();

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      {user?.role === UserRole.STUDENT && <AlunoSidebar />}
      {(user?.role === UserRole.ADMIN || user?.role === UserRole.MENTOR) && <AdminSidebar />}
      <div className="flex flex-1 flex-col overflow-x-hidden bg-neutral-50">
        <RequireRole roles={[UserRole.ADMIN, UserRole.MENTOR, UserRole.STUDENT]}>{children}</RequireRole>
      </div>
    </div>
  );
}
