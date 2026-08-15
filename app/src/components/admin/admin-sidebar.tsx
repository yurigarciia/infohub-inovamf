"use client";

import { SidebarNav, type SidebarNavItem } from "@/components/layout/sidebar-nav";
import { useSession } from "@/lib/session";
import { UserRole } from "@/types";

/** Itens da sidebar por papel — Dashboard/Auditoria/Contas são
 * exclusivos do administrador (RF-22, RNF-05, RF-03); mentor só enxerga
 * o funil de equipes sob sua responsabilidade. */
function itemsForRole(role: UserRole | undefined): SidebarNavItem[] {
  const items: SidebarNavItem[] = [{ label: "Funil de equipes", href: "/admin" }];
  if (role === UserRole.ADMIN) {
    items.push(
      { label: "Dashboard", href: "/admin/dashboard" },
      { label: "Auditoria", href: "/admin/auditoria" },
      { label: "Contas", href: "/admin/contas" },
    );
  }
  return items;
}

/** Sidebar da área administrativa. */
export function AdminSidebar() {
  const { user } = useSession();
  return <SidebarNav items={itemsForRole(user?.role)} />;
}
