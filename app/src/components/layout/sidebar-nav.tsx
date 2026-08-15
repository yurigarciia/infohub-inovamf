"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SidebarNavItem {
  label: string;
  href: string;
}

/** Sidebar fixa genérica (desktop) / barra horizontal com scroll
 * (mobile) — usada tanto pela área administrativa quanto pela área do
 * aluno, cada uma só passando sua própria lista de itens. */
export function SidebarNav({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname();

  // Item ativo = o de href mais específico que casa com a rota atual
  // (evita dois itens ficarem ativos ao mesmo tempo quando um href é
  // prefixo do outro, ex.: /admin e /admin/dashboard).
  const activeHref = items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-border bg-white px-4 py-2 md:w-56 md:flex-col md:border-b-0 md:border-r md:px-3 md:py-4">
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
