"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";

/**
 * Ação de sessão no header (RF-01). O atalho de demonstração "Ver
 * como…" que existia aqui foi movido para a tela de `/login`
 * (T-FE-21) — o header deve refletir só a sessão ativa, não servir de
 * seletor de perfis.
 */
export function RoleSwitcher() {
  const router = useRouter();
  const { user, isLoading, signOut } = useSession();

  function handleSignOut() {
    signOut();
    // Sem isso, quem sai de uma página restrita (ex.: /admin/contas)
    // ficava preso vendo a mensagem de acesso negado em vez de voltar
    // pra landing page.
    router.push("/");
  }

  if (isLoading || !user) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="text-sm font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
    >
      Sair
    </button>
  );
}
