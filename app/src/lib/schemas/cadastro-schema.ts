import { z } from "zod";
import { IdeaMaturity } from "@/types";

export const memberSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo"),
  email: z.string().trim().email("E-mail inválido"),
  course: z.string().trim().min(2, "Informe o curso"),
  period: z.string().trim().min(1, "Informe o semestre/período"),
});

/** Formulário inicial do aluno — Etapa 1 do funil (RF-02, RF-04, RF-05). */
export const cadastroFormSchema = z.object({
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
  ideaMaturity: z.enum(Object.values(IdeaMaturity) as [IdeaMaturity, ...IdeaMaturity[]], {
    message: "Selecione o estágio atual da ideia",
  }),
  sourceOrigin: z.string().trim().optional(),
  lgpdConsent: z.boolean().refine((v) => v === true, {
    message: "É necessário aceitar os termos de tratamento de dados para enviar",
  }),
});

export type CadastroFormValues = z.infer<typeof cadastroFormSchema>;
