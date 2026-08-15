"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { JourneySteps } from "@/components/landing/journey-steps";
import { useSession } from "@/lib/session";
import { UserRole } from "@/types";

/** Landing page pública. Quem já está com sessão ativa (T-FE-05/06) é
 * levado direto pra sua área — a landing é só a porta de entrada de
 * quem ainda não entrou. */
export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useSession();

  useEffect(() => {
    if (isLoading || !user) return;
    router.replace(user.role === UserRole.STUDENT ? "/aluno" : "/admin");
  }, [isLoading, user, router]);

  if (isLoading || user) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col">
      <section
        className="flex flex-col items-center gap-6 px-6 py-20 text-center text-white"
        style={{
          background: "linear-gradient(135deg, #4A0E1A 0%, #D62027 55%, #F7941D 100%)",
        }}
      >
        <Image src="/logotipo.png" alt="InfoHub" width={72} height={72} />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            InfoHub → InovAMF
          </h1>
          <p className="max-w-xl text-sm text-white/90 sm:text-base">
            Do esboço de uma ideia até a inscrição no InovAMF: acompanhe cada etapa da jornada da
            sua equipe no laboratório de inovação da Faculdade Antonio Meneghetti.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            className="bg-white text-brand-800 hover:bg-white/90"
            render={<Link href="/cadastro" />}
            nativeButton={false}
          >
            Enviar minha ideia
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/60 bg-transparent text-white hover:bg-white/10"
            render={<Link href="/login" />}
            nativeButton={false}
          >
            Entrar
          </Button>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16">
        <div className="flex flex-col gap-1 text-center">
          <h2 className="text-xl font-semibold">Como funciona a jornada</h2>
          <p className="text-sm text-muted-foreground">
            Seis etapas guiadas por mentores, da ideia inicial até a inscrição no InovAMF.
          </p>
        </div>
        <JourneySteps />
      </section>
    </div>
  );
}
