"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session";
import { UserRole } from "@/types";

interface SidebarItem {
  label: string;
  href: string;
}

/** Itens da sidebar por papel — Dashboard/Auditoria/Contas são
 * exclusivos do administrador (RF-22, RNF-05, RF-03); mentor só enxerga
 * o funil de equipes sob sua responsabilidade. */
function itemsForRole(role: UserRole | undefined): SidebarItem[] {
  const items: SidebarItem[] = [{ label: "Funil de equipes", href: "/admin" }];
  if (role === UserRole.ADMIN) {
    items.push(
      { label: "Dashboard", href: "/admin/dashboard" },
      { label: "Auditoria", href: "/admin/auditoria" },
      { label: "Contas", href: "/admin/contas" },
    );
  }
  return items;
}

/** Sidebar fixa da área administrativa — substitui os links soltos que
 * antes viviam no header, já que o admin acumulou telas demais pra
 * caber numa barra horizontal. */
export function AdminSidebar() {
  const { user } = useSession();
  const pathname = usePathname();
  const items = itemsForRole(user?.role);

  const activeHref = items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-border bg-neutral-50 px-4 py-2 md:w-56 md:flex-col md:border-b-0 md:border-r md:px-3 md:py-4">
      {items.map((item) => {
        const isActive = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? "bg-brand-50 text-brand-700"
                : "text-muted-foreground hover:bg-neutral-100 hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
