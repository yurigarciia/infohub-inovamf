"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/forms/field";
import { USER_ROLE_LABELS } from "@/lib/labels";
import { createStaffUser } from "@/services";
import { UserRole } from "@/types";

/** Formulário de criação de conta de administrador/mentor (RF-03). */
export function StaffForm({
  actorUserId,
  onCreated,
  onCancel,
}: {
  actorUserId: string;
  onCreated: () => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<typeof UserRole.ADMIN | typeof UserRole.MENTOR>(
    UserRole.MENTOR,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError("Informe nome e e-mail.");
      return;
    }
    setIsSaving(true);
    try {
      await createStaffUser({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, role }, actorUserId);
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a conta.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome completo" htmlFor="staff-name">
          <Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="E-mail" htmlFor="staff-email">
          <Input id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Telefone (opcional)" htmlFor="staff-phone">
          <Input id="staff-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Papel" htmlFor="staff-role">
          <Select value={role} onValueChange={(v) => v && setRole(v as typeof role)}>
            <SelectTrigger id="staff-role" className="w-full">
              <SelectValue>{() => USER_ROLE_LABELS[role]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UserRole.MENTOR}>{USER_ROLE_LABELS[UserRole.MENTOR]}</SelectItem>
              <SelectItem value={UserRole.ADMIN}>{USER_ROLE_LABELS[UserRole.ADMIN]}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={isSaving} onClick={handleSubmit}>
          {isSaving ? "Criando…" : "Criar conta"}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground underline underline-offset-2"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
