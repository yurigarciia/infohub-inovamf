"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_ROLE_LABELS } from "@/lib/labels";
import { setStaffUserActive, updateStaffUser } from "@/services";
import { UserRole } from "@/types";
import type { User } from "@/types";

/** Linha de uma conta de staff, com edição inline e ativar/desativar
 * (RF-03). */
export function StaffListItem({
  staffUser,
  actorUserId,
  onChanged,
}: {
  staffUser: User;
  actorUserId: string;
  onChanged: () => Promise<void>;
}) {
  const isSelf = staffUser.id === actorUserId;
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(staffUser.name);
  const [phone, setPhone] = useState(staffUser.phone ?? "");
  const [role, setRole] = useState<typeof UserRole.ADMIN | typeof UserRole.MENTOR>(
    staffUser.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.MENTOR,
  );
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateStaffUser({ userId: staffUser.id, name: name.trim(), phone: phone.trim(), role }, actorUserId);
      setIsEditing(false);
      await onChanged();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive() {
    setIsSaving(true);
    try {
      await setStaffUserActive(staffUser.id, !staffUser.isActive, actorUserId);
      await onChanged();
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone" />
          <Select value={role} onValueChange={(v) => v && setRole(v as typeof role)}>
            <SelectTrigger className="w-full">
              <SelectValue>{() => USER_ROLE_LABELS[role]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UserRole.MENTOR}>{USER_ROLE_LABELS[UserRole.MENTOR]}</SelectItem>
              <SelectItem value={UserRole.ADMIN}>{USER_ROLE_LABELS[UserRole.ADMIN]}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={isSaving || !name.trim()} onClick={handleSave}>
            {isSaving ? "Salvando…" : "Salvar"}
          </Button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{staffUser.name}</span>
          <Badge variant="secondary">{USER_ROLE_LABELS[staffUser.role]}</Badge>
          {!staffUser.isActive && <Badge variant="destructive">Desativado</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {staffUser.email}
          {staffUser.phone ? ` · ${staffUser.phone}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Editar
        </button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isSaving || (isSelf && staffUser.isActive)}
          title={isSelf && staffUser.isActive ? "Você não pode desativar sua própria conta." : undefined}
          onClick={handleToggleActive}
        >
          {staffUser.isActive ? "Desativar" : "Reativar"}
        </Button>
      </div>
    </div>
  );
}
