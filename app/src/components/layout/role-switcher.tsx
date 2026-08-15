"use client";

import { useEffect, useState } from "react";
import { TEAM_MEMBER_ROLE_LABELS, USER_ROLE_LABELS } from "@/lib/labels";
import { useSession } from "@/lib/session";
import { getStudentMemberRoleSummary } from "@/services";
import { TeamMemberRole, UserRole } from "@/types";

/**
 * Seletor de "papel ativo" (T-FE-05) — substitui o login real enquanto
 * ele não existe (T-FE-06). Trocar aqui muda os itens de navegação
 * visíveis no AppShell, refletindo RNF-03.
 */
export function RoleSwitcher() {
  const { user, users, isLoading, setUserId, signOut } = useSession();
  const [studentRoles, setStudentRoles] = useState<Map<string, TeamMemberRole>>(new Map());

  useEffect(() => {
    getStudentMemberRoleSummary().then(setStudentRoles);
  }, []);

  if (isLoading) {
    return <span className="text-xs text-muted-foreground">Carregando sessão…</span>;
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <label
        htmlFor="role-switcher"
        className="hidden shrink-0 text-xs text-muted-foreground sm:inline"
      >
        Atalho de demonstração:
      </label>
      <select
        id="role-switcher"
        className="h-9 w-28 min-w-0 rounded-md border border-input bg-background px-2 text-sm sm:w-auto"
        value={user?.id ?? ""}
        onChange={(e) => setUserId(e.target.value)}
      >
        <option value="" disabled>
          Ver como…
        </option>
        {users.map((u) => {
          const memberRole = studentRoles.get(u.id);
          const subLabel =
            u.role === UserRole.STUDENT && memberRole
              ? TEAM_MEMBER_ROLE_LABELS[memberRole]
              : null;
          return (
            <option key={u.id} value={u.id}>
              {u.name} — {USER_ROLE_LABELS[u.role]}
              {subLabel ? ` (${subLabel})` : ""}
            </option>
          );
        })}
      </select>
      {user && (
        <button
          type="button"
          onClick={signOut}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Sair
        </button>
      )}
    </div>
  );
}
