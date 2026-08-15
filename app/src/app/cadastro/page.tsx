"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IdeaSection } from "@/components/cadastro/idea-section";
import { LeaderFields } from "@/components/cadastro/leader-fields";
import { LgpdConsentField } from "@/components/cadastro/lgpd-consent-field";
import { MemberFields } from "@/components/cadastro/member-fields";
import { CURRENT_COHORT } from "@/lib/constants";
import {
  cadastroFormSchema,
  type CadastroFormValues,
} from "@/lib/schemas/cadastro-schema";
import { useSession } from "@/lib/session";
import { createTeamFromInscription, getIdeaAreas } from "@/services";
import type { IdeaArea } from "@/types";

/** Formulário inicial do aluno — Etapa 1 do funil (RF-02, RF-04, RF-05).
 * Cada seção do formulário vive em `components/cadastro/*`; esta página
 * só orquestra o `react-hook-form` e o envio. */
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
  } = useForm<CadastroFormValues>({
    resolver: zodResolver(cadastroFormSchema),
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
      ideaMaturity: "" as CadastroFormValues["ideaMaturity"],
      sourceOrigin: "",
      lgpdConsent: false,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "members" });

  async function onSubmit(values: CadastroFormValues) {
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
            Etapa 1 da jornada — preencha os dados abaixo para dar início ao acompanhamento da sua
            equipe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-8" onSubmit={handleSubmit(onSubmit)}>
            <LeaderFields register={register} errors={errors} />
            <MemberFields
              fields={fields}
              register={register}
              errors={errors}
              onAppend={() => append({ name: "", email: "", course: "", period: "" })}
              onRemove={remove}
            />
            <IdeaSection register={register} control={control} errors={errors} areas={areas} />
            <LgpdConsentField control={control} errors={errors} />

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
