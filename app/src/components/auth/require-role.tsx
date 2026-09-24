"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { UserRole } from "@/types";

/**
 * Guarda de rota das áreas logadas (RNF-03). Sem sessão -> /login?next=<rota>
 * (a tela de login volta para lá depois de entrar); papel errado -> a área
 * do próprio papel. Enquanto a sessão carrega, nada da página monta — assim
 * as telas nunca disparam chamadas à API sem token (antes o 401 virava erro
 * não tratado no console e uma tela "Carregando…" eterna).
 *
 * É só UX: a fronteira de autorização de verdade continua na API.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[];
  children: ReactNode;
}) {
  const { user, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = !!user && roles.includes(user.role);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (!allowed) {
      router.replace(user.role === UserRole.STUDENT ? "/aluno" : "/admin");
    }
  }, [isLoading, user, allowed, pathname, router]);

  if (isLoading || !allowed) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">Carregando…</p>;
  }
  return <>{children}</>;
}
