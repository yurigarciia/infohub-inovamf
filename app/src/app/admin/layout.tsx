import { AdminSidebar } from "@/components/admin/admin-sidebar";

/** Layout da área administrativa — sidebar fixa + conteúdo. A guarda de
 * papel (ADMIN/MENTOR, e ADMIN-only pras telas exclusivas) continua em
 * cada página, já que a sidebar é só chrome de navegação, não a
 * fronteira de autorização (ver RNF-03 em docs/frontend-plan.md). */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-x-hidden">{children}</div>
    </div>
  );
}
