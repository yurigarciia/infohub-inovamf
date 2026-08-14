"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/session";
import { getStudentMemberRoleSummary } from "@/services";
import { TeamMemberRole, UserRole } from "@/types";

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: "Administrador",
  [UserRole.MENTOR]: "Mentor",
  [UserRole.STUDENT]: "Aluno",
};

const STUDENT_SUB_LABELS: Record<TeamMemberRole, string> = {
  [TeamMemberRole.LEADER]: "líder",
  [TeamMemberRole.MEMBER]: "integrante",
};

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
    <div className="flex items-center gap-2">
      <label htmlFor="role-switcher" className="text-xs text-muted-foreground">
        Atalho de demonstração:
      </label>
      <select
        id="role-switcher"
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        value={user?.id ?? ""}
        onChange={(e) => setUserId(e.target.value)}
      >
        <option value="" disabled>
          Ver como…
        </option>
        {users.map((u) => {
          const memberRole = studentRoles.get(u.id);
          const subLabel =
            u.role === UserRole.STUDENT && memberRole ? STUDENT_SUB_LABELS[memberRole] : null;
          return (
            <option key={u.id} value={u.id}>
              {u.name} — {ROLE_LABELS[u.role]}
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
