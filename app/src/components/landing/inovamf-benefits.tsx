import { Building2, GraduationCap, Handshake, Rocket, Users } from "lucide-react";

const BENEFITS = [
  {
    icon: Users,
    title: "Mentoria especializada",
    description: "Acompanhamento de profissionais experientes em cada etapa da jornada.",
  },
  {
    icon: Building2,
    title: "Infraestrutura completa",
    description: "Salas de empresas, auditório e espaços de projeto no Recanto Maestro.",
  },
  {
    icon: Rocket,
    title: "Incubação e aceleração",
    description: "Programas dedicados a transformar a ideia em negócio sustentável.",
  },
  {
    icon: Handshake,
    title: "Parcerias estratégicas",
    description: "Conexão entre a academia, o mercado e o setor público.",
  },
  {
    icon: GraduationCap,
    title: "Mentalidade empreendedora",
    description: "Programas educacionais focados em liderança e visão de negócio.",
  },
];

/** Grid de benefícios de chegar ao InovAMF — mesmo conteúdo do site
 * institucional, adaptado ao contexto do InfoHub (a jornada que leva
 * até lá). */
export function InovamfBenefits() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {BENEFITS.map(({ icon: Icon, title, description }) => (
        <div key={title} className="flex flex-col gap-2 rounded-lg border border-border bg-white p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-50 text-brand-700">
            <Icon className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      ))}
    </div>
  );
}
