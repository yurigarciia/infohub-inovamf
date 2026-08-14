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
      return [{ label: "Funil de equipes", href: "/admin" }];
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

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logotipo.png" alt="InfoHub" width={32} height={32} />
              <span className="text-sm font-semibold tracking-tight">
                InfoHub <span className="text-muted-foreground">→</span> InovAMF
              </span>
            </Link>
            {navItems.length > 0 && (
              <nav className="flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
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
          <RoleSwitcher />
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
