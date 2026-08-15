"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffForm } from "@/components/admin/staff-form";
import { StaffListItem } from "@/components/admin/staff-list";
import { useSession } from "@/lib/session";
import { getStaffUsers } from "@/services";
import { UserRole } from "@/types";
import type { User } from "@/types";

/** Gestão de contas de administrador/mentor (RF-03). */
export default function ContasPage() {
  const { user, isLoading: sessionLoading } = useSession();
  const [staff, setStaff] = useState<User[] | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function reload() {
    const loaded = await getStaffUsers();
    setStaff(loaded);
  }

  useEffect(() => {
    if (user?.role !== UserRole.ADMIN) return;
    Promise.resolve().then(reload);
  }, [user?.role]);

  if (sessionLoading) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">Carregando…</p>;
  }

  if (user?.role !== UserRole.ADMIN) {
    return (
      <p className="px-6 py-8 text-sm text-muted-foreground">
        A gestão de contas é exclusiva da coordenação (administrador).
      </p>
    );
  }

  if (!staff) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">Carregando…</p>;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Contas</h1>
          <p className="text-sm text-muted-foreground">
            Administradores e mentores com acesso ao painel (RF-03)
          </p>
        </div>
        {!isCreating && (
          <Button type="button" size="sm" onClick={() => setIsCreating(true)}>
            Nova conta
          </Button>
        )}
      </div>

      {isCreating && (
        <StaffForm
          actorUserId={user.id}
          onCreated={async () => {
            setIsCreating(false);
            await reload();
          }}
          onCancel={() => setIsCreating(false)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Contas cadastradas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {staff.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada ainda.</p>
          )}
          {staff.map((staffUser) => (
            <StaffListItem
              key={staffUser.id}
              staffUser={staffUser}
              actorUserId={user.id}
              onChanged={reload}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
