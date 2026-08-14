"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CURRENT_COHORT } from "@/lib/constants";
import { useSession } from "@/lib/session";
import { createTeamFromInscription, getIdeaAreas } from "@/services";
import { IdeaMaturity } from "@/types";
import type { IdeaArea } from "@/types";

const IDEA_MATURITY_LABELS: Record<IdeaMaturity, string> = {
  [IdeaMaturity.IDEA]: "Apenas ideia",
  [IdeaMaturity.PROTOTYPE]: "Protótipo",
  [IdeaMaturity.MVP_IN_PROGRESS]: "MVP em desenvolvimento",
  [IdeaMaturity.MVP_READY]: "MVP pronto",
};

const memberSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo"),
  email: z.string().trim().email("E-mail inválido"),
  course: z.string().trim().min(2, "Informe o curso"),
  period: z.string().trim().min(1, "Informe o semestre/período"),
});

const formSchema = z.object({
  leaderName: z.string().trim().min(3, "Informe o nome completo"),
  leaderEmail: z.string().trim().email("E-mail inválido"),
  leaderPhone: z.string().trim().min(8, "Informe um telefone/WhatsApp válido"),
  leaderCourse: z.string().trim().min(2, "Informe o curso"),
  leaderPeriod: z.string().trim().min(1, "Informe o semestre/período"),
  members: z.array(memberSchema),
  ideaName: z.string().trim().min(3, "Dê um nome para a ideia/projeto"),
  ideaDescription: z
    .string()
    .trim()
    .min(10, "Descreva a ideia com um pouco mais de detalhe (mín. 10 caracteres)"),
  areaId: z.string().min(1, "Selecione a área/setor da ideia"),
  ideaMaturity: z.enum(
    Object.values(IdeaMaturity) as [IdeaMaturity, ...IdeaMaturity[]],
    { message: "Selecione o estágio atual da ideia" },
  ),
  sourceOrigin: z.string().trim().optional(),
  lgpdConsent: z.boolean().refine((v) => v === true, {
    message: "É necessário aceitar os termos de tratamento de dados para enviar",
  }),
});

type FormValues = z.infer<typeof formSchema>;

/** Formulário inicial do aluno — Etapa 1 do funil (RF-02, RF-04, RF-05). */
export default function CadastroPage() {
  const router = useRouter();
  const { setUserId } = useSession();
  const [areas, setAreas] = useState<IdeaArea[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    getIdeaAreas().then(setAreas);
  }, []);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leaderName: "",
      leaderEmail: "",
      leaderPhone: "",
      leaderCourse: "",
      leaderPeriod: "",
      members: [],
      ideaName: "",
      ideaDescription: "",
      areaId: "",
      ideaMaturity: "" as FormValues["ideaMaturity"],
      sourceOrigin: "",
      lgpdConsent: false,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "members" });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      const { leaderUserId } = await createTeamFromInscription({
        leader: {
          name: values.leaderName,
          email: values.leaderEmail,
          phone: values.leaderPhone,
          course: values.leaderCourse,
          period: values.leaderPeriod,
        },
        members: values.members,
        ideaName: values.ideaName,
        ideaDescription: values.ideaDescription,
        areaId: Number(values.areaId),
        ideaMaturity: values.ideaMaturity,
        sourceOrigin: values.sourceOrigin || undefined,
        cohort: CURRENT_COHORT,
      });
      await setUserId(leaderUserId);
      router.push("/aluno");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Não foi possível enviar o cadastro.");
    }
  }

  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Envie sua ideia para o InfoHub</CardTitle>
          <CardDescription>
            Etapa 1 da jornada — preencha os dados abaixo para dar início ao
            acompanhamento da sua equipe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-8" onSubmit={handleSubmit(onSubmit)}>
            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-foreground">
                Seus dados (responsável pelo envio)
              </h2>
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

            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Colegas de equipe</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: "", email: "", course: "", period: "" })}
                >
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
                    <span className="text-xs font-medium text-muted-foreground">
                      Colega {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(index)}
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
                      <Input
                        id={`members.${index}.email`}
                        type="email"
                        {...register(`members.${index}.email`)}
                      />
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
                            {(value: string | null) =>
                              areas.find((area) => String(area.id) === value)?.name
                            }
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
                <Field
                  label="Estágio atual da ideia"
                  htmlFor="ideaMaturity"
                  error={errors.ideaMaturity?.message}
                >
                  <Controller
                    name="ideaMaturity"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="ideaMaturity" className="w-full">
                          <SelectValue placeholder="Selecione o estágio">
                            {(value: IdeaMaturity | null) =>
                              value ? IDEA_MATURITY_LABELS[value] : null
                            }
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

            <section className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <Controller
                  name="lgpdConsent"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="lgpdConsent"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="lgpdConsent" className="text-sm font-normal leading-snug">
                  Autorizo o InfoHub a tratar meus dados pessoais e dos colegas
                  informados para fins de acompanhamento da jornada no
                  programa, conforme a LGPD.
                </Label>
              </div>
              {errors.lgpdConsent && (
                <p className="text-sm text-destructive">{errors.lgpdConsent.message}</p>
              )}
            </section>

            {submitError && (
              <p role="alert" className="text-sm text-destructive">
                {submitError}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enviando…" : "Enviar cadastro"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
