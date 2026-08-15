"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitTask } from "@/services";

const ALLOWED_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg", "video/mp4"];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB — RNF-04

/** Formulário inline de envio de entrega (RF-14): upload de arquivo
 * (validado por tipo/tamanho, RNF-04) ou link externo (Pitch Vídeo, Q3). */
export function TaskSubmissionForm({
  taskId,
  studentId,
  onSubmitted,
  onCancel,
}: {
  taskId: string;
  studentId: string;
  onSubmitted: () => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"file" | "link">("file");
  const [linkValue, setLinkValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError("Tipo de arquivo não permitido. Envie PDF, imagem (PNG/JPEG) ou vídeo (MP4).");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`Arquivo muito grande (${(file.size / (1024 * 1024)).toFixed(1)} MB). Limite: 50 MB.`);
      event.target.value = "";
      return;
    }

    setIsSubmitting(true);
    try {
      const fileUrl = URL.createObjectURL(file);
      await submitTask({ taskId, submittedById: studentId, fileUrl, isExternalLink: false });
      onSubmitted();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLinkSubmit() {
    setError(null);
    try {
      new URL(linkValue);
    } catch {
      setError("Informe uma URL válida (ex.: link do YouTube ou Google Drive).");
      return;
    }
    setIsSubmitting(true);
    try {
      await submitTask({ taskId, submittedById: studentId, fileUrl: linkValue, isExternalLink: true });
      setLinkValue("");
      onSubmitted();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "file" ? "default" : "outline"}
          onClick={() => setMode("file")}
        >
          Enviar arquivo
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "link" ? "default" : "outline"}
          onClick={() => setMode("link")}
        >
          Enviar link
        </Button>
      </div>

      {mode === "file" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`file-${taskId}`}>Arquivo (PDF, imagem ou vídeo — até 50 MB)</Label>
          <Input
            id={`file-${taskId}`}
            type="file"
            accept=".pdf,image/png,image/jpeg,video/mp4"
            disabled={isSubmitting}
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`link-${taskId}`}>Link (ex.: Pitch Vídeo no YouTube/Drive)</Label>
          <div className="flex gap-2">
            <Input
              id={`link-${taskId}`}
              type="url"
              placeholder="https://…"
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
            />
            <Button type="button" size="sm" disabled={isSubmitting} onClick={handleLinkSubmit}>
              {isSubmitting ? "Enviando…" : "Enviar"}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="button"
        onClick={onCancel}
        className="self-start text-xs text-muted-foreground underline underline-offset-2"
      >
        Cancelar
      </button>
    </div>
  );
}
