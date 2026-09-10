"use client";

import { useState } from "react";
import { useSession } from "@/lib/session";
import { ApiError } from "@/lib/api-client";
import { UserRole } from "@/types";

/** Atalho de demonstração: faz login real com as contas do seed
 * (`npm run db:seed`), todas com a senha `senha123`. Vive só na tela de
 * login — o header da aplicação não expõe isso. */
const DEMO_ACCOUNTS: { email: string; label: string }[] = [
  { email: "ana.souza@infohub.amf.br", label: "Ana Souza — Administradora" },
  { email: "fernanda.ribeiro@infohub.amf.br", label: "Fernanda Ribeiro — Mentora" },
  { email: "carlos.lima@infohub.amf.br", label: "Carlos Lima — Mentor" },
  { email: "joao.alves@acad.amf.br", label: "João Alves — Aluno (líder da team-1)" },
  { email: "beatriz.fernandes@acad.amf.br", label: "Beatriz Fernandes — Aluna (2 equipes)" },
  { email: "marina.costa@acad.amf.br", label: "Marina Costa — Aluna" },
];

const DEMO_PASSWORD = "senha123";

export function DemoProfilePicker({
  onPick,
}: {
  onPick: (user: { role: UserRole }) => void;
}) {
  const { signIn } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleChange(email: string) {
    if (!email) return;
    setError(null);
    setBusy(true);
    try {
      const user = await signIn(email, DEMO_PASSWORD);
      onPick(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha no login de demonstração.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-1.5 border-t border-border pt-4">
      <label htmlFor="demo-profile-picker" className="text-xs text-muted-foreground">
        Atalho de demonstração — entrar com uma conta do seed (senha {DEMO_PASSWORD})
      </label>
      <select
        id="demo-profile-picker"
        defaultValue=""
        disabled={busy}
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        onChange={(e) => {
          const { value } = e.target;
          e.target.value = "";
          void handleChange(value);
        }}
      >
        <option value="" disabled>
          {busy ? "Entrando…" : "Entrar como…"}
        </option>
        {DEMO_ACCOUNTS.map((acc) => (
          <option key={acc.email} value={acc.email}>
            {acc.label}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
