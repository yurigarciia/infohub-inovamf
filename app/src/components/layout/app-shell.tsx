"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useSession } from "@/lib/session";
import { UserRole } from "@/types";
import { RoleSwitcher } from "./role-switcher";

interface NavItem {
  label: string;
  href: string;
}

/** Itens de navegação por papel (RNF-03: cada papel só vê o que é seu). */
function navItemsForRole(role: UserRole | undefined): NavItem[] {
  switch (role) {
    case UserRole.ADMIN:
      return [
        { label: "Funil de equipes", href: "/admin" },
        { label: "Dashboard", href: "/admin/dashboard" },
      ];
    case UserRole.MENTOR:
      return [{ label: "Minhas equipes", href: "/admin" }];
    case UserRole.STUDENT:
      return [{ label: "Minhas tarefas", href: "/aluno" }];
    default:
      return [];
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const pathname = usePathname();
  const navItems = navItemsForRole(user?.role);

  // Item ativo = o de href mais específico que casa com a rota atual
  // (evita "Funil de equipes" e "Dashboard" ficarem ativos ao mesmo
  // tempo, já que /admin/dashboard também começa com /admin).
  const activeHref = navItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <Image src="/logotipo.png" alt="InfoHub" width={32} height={32} />
              <span className="hidden text-sm font-semibold tracking-tight sm:inline">
                InfoHub <span className="text-muted-foreground">→</span> InovAMF
              </span>
            </Link>
            {navItems.length > 0 && (
              <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
                {navItems.map((item) => {
                  const isActive = item.href === activeHref;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
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
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {!user && (
              <>
                <Link
                  href="/cadastro"
                  className="text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground"
                >
                  <span className="sm:hidden">Inscrever-se</span>
                  <span className="hidden sm:inline">Enviar minha ideia</span>
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-medium whitespace-nowrap text-brand-700 hover:text-brand-800"
                >
                  Entrar
                </Link>
              </>
            )}
            <RoleSwitcher />
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
