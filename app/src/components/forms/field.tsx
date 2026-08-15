import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

/** Wrapper de campo de formulário: label + controle + mensagem de erro.
 * Genérico — não depende de nenhum formulário específico. */
export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
