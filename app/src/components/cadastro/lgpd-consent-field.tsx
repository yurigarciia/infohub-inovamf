import type { Control, FieldErrors } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { CadastroFormValues } from "@/lib/schemas/cadastro-schema";

/** Consentimento LGPD obrigatório (RNF-02) — bloqueia o envio se não marcado. */
export function LgpdConsentField({
  control,
  errors,
}: {
  control: Control<CadastroFormValues>;
  errors: FieldErrors<CadastroFormValues>;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <Controller
          name="lgpdConsent"
          control={control}
          render={({ field }) => (
            <Checkbox id="lgpdConsent" checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
        <Label htmlFor="lgpdConsent" className="text-sm font-normal leading-snug">
          Autorizo o InfoHub a tratar meus dados pessoais e dos colegas informados para fins de
          acompanhamento da jornada no programa, conforme a LGPD.
        </Label>
      </div>
      {errors.lgpdConsent && <p className="text-sm text-destructive">{errors.lgpdConsent.message}</p>}
    </section>
  );
}
