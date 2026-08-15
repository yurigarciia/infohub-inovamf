import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import type { CadastroFormValues } from "@/lib/schemas/cadastro-schema";

/** Seção "Seus dados" do formulário de inscrição — dados do aluno
 * líder/responsável pelo envio (RF-04). */
export function LeaderFields({
  register,
  errors,
}: {
  register: UseFormRegister<CadastroFormValues>;
  errors: FieldErrors<CadastroFormValues>;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-foreground">Seus dados (responsável pelo envio)</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo" htmlFor="leaderName" error={errors.leaderName?.message}>
          <Input id="leaderName" {...register("leaderName")} />
        </Field>
        <Field label="E-mail" htmlFor="leaderEmail" error={errors.leaderEmail?.message}>
          <Input id="leaderEmail" type="email" {...register("leaderEmail")} />
        </Field>
        <Field label="Telefone/WhatsApp" htmlFor="leaderPhone" error={errors.leaderPhone?.message}>
          <Input id="leaderPhone" {...register("leaderPhone")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Curso" htmlFor="leaderCourse" error={errors.leaderCourse?.message}>
            <Input id="leaderCourse" {...register("leaderCourse")} />
          </Field>
          <Field label="Período" htmlFor="leaderPeriod" error={errors.leaderPeriod?.message}>
            <Input id="leaderPeriod" placeholder="ex.: 5º" {...register("leaderPeriod")} />
          </Field>
        </div>
      </div>
    </section>
  );
}
