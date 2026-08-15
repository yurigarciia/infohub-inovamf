"use client";

import { useEffect, useState } from "react";
import { TEAM_MEMBER_ROLE_LABELS, USER_ROLE_LABELS } from "@/lib/labels";
import { useSession } from "@/lib/session";
import { getStudentMemberRoleSummary } from "@/services";
import { TeamMemberRole, UserRole } from "@/types";

/** Atalho de demonstração (T-FE-05/T-FE-21): loga direto como um dos
 * usuários mockados, sem precisar saber e-mail/senha de cor. Vive só
 * na tela de login — o header da aplicação não deve expor isso (ver
 * `role-switcher.tsx`). */
export function DemoProfilePicker({
  onPick,
}: {
  onPick: (user: { id: string; role: UserRole }) => void;
}) {
  const { users } = useSession();
  const [studentRoles, setStudentRoles] = useState<Map<string, TeamMemberRole>>(new Map());

  useEffect(() => {
    getStudentMemberRoleSummary().then(setStudentRoles);
  }, []);

  function handleChange(userId: string) {
    const user = users.find((u) => u.id === userId);
    if (user) onPick(user);
  }

  if (users.length === 0) return null;

  return (
    <div className="mt-6 flex flex-col gap-1.5 border-t border-border pt-4">
      <label htmlFor="demo-profile-picker" className="text-xs text-muted-foreground">
        Atalho de demonstração — entrar como um dos {users.length} usuários mockados
      </label>
      <select
        id="demo-profile-picker"
        defaultValue=""
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        onChange={(e) => {
          handleChange(e.target.value);
          e.target.value = "";
        }}
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
    </div>
  );
}
