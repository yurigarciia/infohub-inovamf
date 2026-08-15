"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { addTeamNote } from "@/services";
import type { TeamDetail } from "@/types";

/** Anotações internas do mentor/admin (RF-10) — nunca visíveis na área
 * do aluno; o card inteiro só é renderizado para `isStaff` pelo chamador. */
export function TeamNotesCard({
  team,
  authorId,
  onAdded,
}: {
  team: TeamDetail;
  authorId: string;
  onAdded: () => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleAdd() {
    if (!content.trim()) return;
    setIsSaving(true);
    try {
      await addTeamNote(team.id, authorId, content.trim());
      setContent("");
      await onAdded();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Anotações internas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          Visível só para admin/mentor — nunca aparece na área do aluno (RF-10).
        </p>
        {team.notes.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma anotação ainda.</p>
        )}
        <ul className="flex flex-col gap-2 text-sm">
          {team.notes.map((note) => (
            <li key={note.id} className="rounded-md bg-neutral-100 p-2">
              <p>{note.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {note.author.name} — {formatDate(note.createdAt)}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2">
          <Textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Registrar anotação sobre esta equipe…"
          />
          <Button
            type="button"
            size="sm"
            className="self-start"
            disabled={isSaving || !content.trim()}
            onClick={handleAdd}
          >
            {isSaving ? "Salvando…" : "Adicionar anotação"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
