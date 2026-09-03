"use client";

import { KanbanSquare, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import { SidebarNav, type SidebarNavItem } from "@/components/layout/sidebar-nav";
import { useSession } from "@/lib/session";
import { UserRole } from "@/types";

/** Itens da sidebar por papel — Dashboard/Auditoria/Contas são
 * exclusivos do administrador (RF-22, RNF-05, RF-03); mentor só enxerga
 * o funil de equipes sob sua responsabilidade. Dashboard vem primeiro
 * (T-FE-28): é a home da área administrativa (`/admin`). */
function itemsForRole(role: UserRole | undefined): SidebarNavItem[] {
  const items: SidebarNavItem[] = [];
  if (role === UserRole.ADMIN) {
    items.push({ label: "Dashboard", href: "/admin", icon: LayoutDashboard });
  }
  items.push({ label: "Funil de equipes", href: "/admin/equipes", icon: KanbanSquare });
  if (role === UserRole.ADMIN) {
    items.push(
      { label: "Auditoria", href: "/admin/auditoria", icon: ShieldCheck },
      { label: "Contas", href: "/admin/contas", icon: Users },
    );
  }
  return items;
}

/** Sidebar da área administrativa. */
export function AdminSidebar() {
  const { user } = useSession();
  return <SidebarNav items={itemsForRole(user?.role)} />;
}
