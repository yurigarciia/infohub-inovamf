import type { FieldArrayWithId, FieldErrors, UseFormRegister } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import type { CadastroFormValues } from "@/lib/schemas/cadastro-schema";

/** Seção "Colegas de equipe" — campo repetível de integrantes, cada um
 * com e-mail próprio (usado no lookup-or-create da equipe, ver
 * PLAN.md T005 e Q4). */
export function MemberFields({
  fields,
  register,
  errors,
  onAppend,
  onRemove,
}: {
  fields: FieldArrayWithId<CadastroFormValues, "members", "id">[];
  register: UseFormRegister<CadastroFormValues>;
  errors: FieldErrors<CadastroFormValues>;
  onAppend: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Colegas de equipe</h2>
        <Button type="button" variant="outline" size="sm" onClick={onAppend}>
          Adicionar colega
        </Button>
      </div>
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum colega adicionado ainda — se sua ideia for individual, pode deixar em branco.
        </p>
      )}
      {fields.map((field, index) => (
        <div key={field.id} className="rounded-lg border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Colega {index + 1}</span>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="text-xs text-destructive underline underline-offset-2"
            >
              Remover
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Nome completo"
              htmlFor={`members.${index}.name`}
              error={errors.members?.[index]?.name?.message}
            >
              <Input id={`members.${index}.name`} {...register(`members.${index}.name`)} />
            </Field>
            <Field
              label="E-mail"
              htmlFor={`members.${index}.email`}
              error={errors.members?.[index]?.email?.message}
            >
              <Input id={`members.${index}.email`} type="email" {...register(`members.${index}.email`)} />
            </Field>
            <Field
              label="Curso"
              htmlFor={`members.${index}.course`}
              error={errors.members?.[index]?.course?.message}
            >
              <Input id={`members.${index}.course`} {...register(`members.${index}.course`)} />
            </Field>
            <Field
              label="Período"
              htmlFor={`members.${index}.period`}
              error={errors.members?.[index]?.period?.message}
            >
              <Input
                id={`members.${index}.period`}
                placeholder="ex.: 3º"
                {...register(`members.${index}.period`)}
              />
            </Field>
          </div>
        </div>
      ))}
    </section>
  );
}
