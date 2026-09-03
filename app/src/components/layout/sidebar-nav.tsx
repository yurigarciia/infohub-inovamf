"use client";

import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const COLLAPSED_STORAGE_KEY = "infohub:sidebar-collapsed";

/** Sidebar fixa genérica (desktop, colapsável — T-FE-27) / barra
 * horizontal com scroll (mobile) — usada tanto pela área
 * administrativa quanto pela área do aluno, cada uma só passando sua
 * própria lista de itens. */
export function SidebarNav({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Preferência é só uma conveniência de UI por dispositivo, não dado
  // de domínio — por isso localStorage em vez de um service/mock.
  useEffect(() => {
    // Promise.resolve().then adia o setState pra fora do corpo síncrono
    // do effect (mesmo padrão usado em outros lugares do app, ex.
    // session.tsx) — evita o disparo de renders em cascata.
    Promise.resolve().then(() => {
      const stored = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
      if (stored === "1") setIsCollapsed(true);
    });
  }, []);

  function toggleCollapsed() {
    setIsCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  // Item ativo = o de href mais específico que casa com a rota atual
  // (evita dois itens ficarem ativos ao mesmo tempo quando um href é
  // prefixo do outro, ex.: /admin e /admin/dashboard).
  const activeHref = items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav
      className={`flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-border bg-white px-4 py-2 md:flex-col md:border-b-0 md:border-r md:px-3 md:py-4 ${
        isCollapsed ? "md:w-16" : "md:w-56"
      }`}
    >
      {items.map((item) => {
        const isActive = item.href === activeHref;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={isCollapsed ? item.label : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors md:justify-start ${
              isCollapsed ? "md:justify-center md:px-0" : ""
            } ${
              isActive
                ? "bg-brand-50 text-brand-700"
                : "text-muted-foreground hover:bg-neutral-100 hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className={isCollapsed ? "md:hidden" : ""}>{item.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={toggleCollapsed}
        title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        className="hidden shrink-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground md:mt-auto md:flex"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        <span className={isCollapsed ? "md:hidden" : ""}>Recolher</span>
      </button>
    </nav>
  );
}
