"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTask, getTaskTemplates } from "@/services";
import type { JourneyStage, TaskTemplate } from "@/types";

/** Formulário de criação de tarefa (RF-11, RF-12) — avulsa ou a partir
 * de um template pré-configurado por etapa. */
export function NewTaskForm({
  teamId,
  currentStageId,
  stages,
  createdById,
  onCreated,
}: {
  teamId: string;
  currentStageId: number;
  stages: JourneyStage[];
  createdById: string;
  onCreated: () => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [stageId, setStageId] = useState(String(currentStageId));
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    getTaskTemplates(Number(stageId)).then(setTemplates);
  }, [isOpen, stageId]);

  function applyTemplate(nextTemplateId: string) {
    setTemplateId(nextTemplateId);
    const template = templates.find((t) => t.id === nextTemplateId);
    if (template) {
      setTitle(template.title);
      setDescription(template.description ?? "");
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!title.trim()) {
      setError("Dê um título para a tarefa.");
      return;
    }
    if (!dueDate) {
      setError("Defina um prazo.");
      return;
    }
    setIsSaving(true);
    try {
      await createTask({
        teamId,
        stageId: Number(stageId),
        templateId: templateId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: new Date(`${dueDate}T00:00:00`),
        createdById,
      });
      setIsOpen(false);
      setTemplateId("");
      setTitle("");
      setDescription("");
      setDueDate("");
      await onCreated();
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => setIsOpen(true)}
      >
        Nova tarefa
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-task-stage">Etapa</Label>
          <Select value={stageId} onValueChange={(v) => v && setStageId(v)}>
            <SelectTrigger id="new-task-stage" className="w-full">
              <SelectValue>
                {() => stages.find((s) => String(s.id) === stageId)?.name ?? "Selecione"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={String(stage.id)}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-task-template">Modelo (opcional)</Label>
          <Select
            value={templateId || "__none__"}
            onValueChange={(v) => applyTemplate(v === "__none__" ? "" : (v ?? ""))}
          >
            <SelectTrigger id="new-task-template" className="w-full">
              <SelectValue>
                {() => templates.find((t) => t.id === templateId)?.title ?? "Tarefa avulsa"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Tarefa avulsa</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-task-title">Título</Label>
        <Input id="new-task-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-task-description">Descrição/instruções</Label>
        <Textarea
          id="new-task-description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-task-due-date">Prazo</Label>
        <Input
          id="new-task-due-date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-48"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={isSaving} onClick={handleSubmit}>
          {isSaving ? "Criando…" : "Criar tarefa"}
        </Button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-xs text-muted-foreground underline underline-offset-2"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
