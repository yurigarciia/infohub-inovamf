"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { configureReminder, sendManualReminder } from "@/services";
import type { TaskWithDetails } from "@/types";

/** Lembretes de uma tarefa (RF-17, RF-20) — configurar data automática
 * ou disparar um lembrete manual avulso agora. O envio de fato (job
 * varrendo tarefas na data configurada) é trabalho de backend; aqui só
 * registra a configuração/disparo. */
export function ReminderSection({
  task,
  onChanged,
}: {
  task: TaskWithDetails;
  onChanged: () => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [remindAt, setRemindAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingManual, setIsSendingManual] = useState(false);

  async function handleConfigure() {
    if (!remindAt) return;
    setIsSaving(true);
    try {
      await configureReminder(task.id, new Date(`${remindAt}T09:00:00`));
      setRemindAt("");
      setIsOpen(false);
      await onChanged();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendManual() {
    setIsSendingManual(true);
    try {
      await sendManualReminder(task.id);
      await onChanged();
    } finally {
      setIsSendingManual(false);
    }
  }

  const lastReminder = [...task.reminders].sort(
    (a, b) => (b.sentAt?.getTime() ?? 0) - (a.sentAt?.getTime() ?? 0),
  )[0];

  return (
    <div className="mt-2 border-t border-border pt-2">
      {task.reminders.length > 0 && (
        <ul className="mb-2 flex flex-col gap-0.5 text-xs text-muted-foreground">
          {task.reminders.map((reminder) => (
            <li key={reminder.id}>
              {formatDate(reminder.remindAt)}
              {reminder.isManual ? " (manual)" : ""} —{" "}
              {reminder.sent ? `enviado em ${formatDate(reminder.sentAt!)}` : "agendado"}
            </li>
          ))}
        </ul>
      )}
      {lastReminder?.sent && (
        <p className="mb-2 text-xs text-muted-foreground">
          Último lembrete enviado: {formatDate(lastReminder.sentAt!)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isSendingManual}
          onClick={handleSendManual}
        >
          {isSendingManual ? "Enviando…" : "Enviar lembrete agora"}
        </Button>
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Configurar lembrete automático
          </button>
        )}
        {isOpen && (
          <>
            <Input
              type="date"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
              className="w-40"
            />
            <Button type="button" size="sm" disabled={isSaving || !remindAt} onClick={handleConfigure}>
              {isSaving ? "Salvando…" : "Salvar"}
            </Button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-muted-foreground underline underline-offset-2"
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
