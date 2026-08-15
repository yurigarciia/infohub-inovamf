import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { IDEA_MATURITY_LABELS } from "@/lib/labels";
import type { CadastroFormValues } from "@/lib/schemas/cadastro-schema";
import { IdeaMaturity } from "@/types";
import type { IdeaArea } from "@/types";

/** Seção "Sobre a ideia" — nome, descrição, área/setor, estágio da
 * ideia e origem (RF-04). */
export function IdeaSection({
  register,
  control,
  errors,
  areas,
}: {
  register: UseFormRegister<CadastroFormValues>;
  control: Control<CadastroFormValues>;
  errors: FieldErrors<CadastroFormValues>;
  areas: IdeaArea[];
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-foreground">Sobre a ideia</h2>
      <Field label="Nome da ideia/projeto" htmlFor="ideaName" error={errors.ideaName?.message}>
        <Input id="ideaName" {...register("ideaName")} />
      </Field>
      <Field
        label="Descrição inicial (pode ser só um esboço)"
        htmlFor="ideaDescription"
        error={errors.ideaDescription?.message}
      >
        <Textarea id="ideaDescription" rows={4} {...register("ideaDescription")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Área/setor" htmlFor="areaId" error={errors.areaId?.message}>
          <Controller
            name="areaId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="areaId" className="w-full">
                  <SelectValue placeholder="Selecione a área">
                    {(value: string | null) => areas.find((area) => String(area.id) === value)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={String(area.id)}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Estágio atual da ideia" htmlFor="ideaMaturity" error={errors.ideaMaturity?.message}>
          <Controller
            name="ideaMaturity"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="ideaMaturity" className="w-full">
                  <SelectValue placeholder="Selecione o estágio">
                    {(value: IdeaMaturity | null) => (value ? IDEA_MATURITY_LABELS[value] : null)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(IdeaMaturity).map((value) => (
                    <SelectItem key={value} value={value}>
                      {IDEA_MATURITY_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>
      <Field
        label="Como conheceu o InfoHub? (opcional)"
        htmlFor="sourceOrigin"
        error={errors.sourceOrigin?.message}
      >
        <Input id="sourceOrigin" {...register("sourceOrigin")} />
      </Field>
    </section>
  );
}
