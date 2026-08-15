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
      <header
        className="shrink-0 overflow-visible"
        style={{ background: "linear-gradient(135deg, #4A0E1A 0%, #D62027 55%, #F7941D 100%)" }}
      >
        <div className="relative mx-auto flex max-w-6xl items-center justify-end gap-4 px-4 py-3 sm:px-6">
          {/* A logo fica fora do fluxo (ver acima do header) — posicionada
              com o mesmo inset (left-4/6) do padding do container, pra
              alinhar com a mesma margem que os botões respeitam à direita. */}
          <Link href="/" className="absolute left-4 top-1/2 z-10 flex -translate-y-1/2 items-center sm:left-6">
            <Image
              src="/logo-branca.png"
              alt="InfoHub"
              width={1024}
              height={1024}
              priority
              className="h-24 w-24 sm:h-28 sm:w-28"
            />
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {!user && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/60 bg-transparent text-white hover:bg-white/10"
                  render={<Link href="/cadastro" />}
                  nativeButton={false}
                >
                  <span className="sm:hidden">Inscrever-se</span>
                  <span className="hidden sm:inline">Enviar minha ideia</span>
                </Button>
                <Button
                  size="sm"
                  className="bg-white text-brand-800 hover:bg-white/90"
                  render={<Link href="/login" />}
                  nativeButton={false}
                >
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
