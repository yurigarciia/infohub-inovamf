"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { RoleSwitcher } from "./role-switcher";

/** Shell da aplicação: header com logo + sessão. A navegação por papel
 * (RNF-03) vive em sidebars próprias — `admin-sidebar.tsx` e
 * `aluno-sidebar.tsx` — já que tanto a área administrativa quanto a do
 * aluno acumularam páginas demais pra caber numa barra horizontal
 * (ver T-FE-18/T-FE-20). */
export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useSession();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image src="/logotipo.png" alt="InfoHub" width={32} height={32} />
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">
              InfoHub <span className="text-muted-foreground">→</span> InovAMF
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {!user && (
              <>
                <Button variant="outline" size="sm" render={<Link href="/cadastro" />} nativeButton={false}>
                  <span className="sm:hidden">Inscrever-se</span>
                  <span className="hidden sm:inline">Enviar minha ideia</span>
                </Button>
                <Button size="sm" render={<Link href="/login" />} nativeButton={false}>
                  Entrar
                </Button>
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
