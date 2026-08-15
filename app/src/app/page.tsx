"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AboutInovamf } from "@/components/landing/about-inovamf";
import { HeroBackgroundVideo } from "@/components/landing/hero-background-video";
import { InovamfBenefits } from "@/components/landing/inovamf-benefits";
import { JourneySteps } from "@/components/landing/journey-steps";
import { LandingFooter } from "@/components/landing/landing-footer";
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
      <section className="relative flex flex-col items-center gap-6 overflow-hidden px-6 py-20 text-center text-white">
        <HeroBackgroundVideo />
        <div className="relative flex flex-col items-center gap-2">
          <Image src="/logotipo.png" alt="" width={112} height={112} className="mb-1 h-28 w-28" />
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Do esboço de uma ideia à inscrição no InovAMF
          </h1>
          <p className="max-w-xl text-sm text-white/90 sm:text-base">
            Acompanhe cada etapa da jornada da sua equipe no laboratório de inovação da Faculdade
            Antonio Meneghetti.
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

      <section className="px-6 py-16">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
          <AboutInovamf />
        </div>
      </section>

      <section className="bg-neutral-50 px-6 py-16">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <div className="flex flex-col gap-1 text-center">
            <h2 className="text-xl font-semibold">Como funciona a jornada</h2>
            <p className="text-sm text-muted-foreground">
              Seis etapas guiadas por mentores, da ideia inicial até a inscrição no InovAMF.
            </p>
          </div>
          <JourneySteps />
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <div className="flex flex-col gap-1 text-center">
            <h2 className="text-xl font-semibold">O que você ganha ao chegar ao InovAMF</h2>
            <p className="text-sm text-muted-foreground">
              Benefícios do ecossistema de inovação da Faculdade e da Fundação Antonio Meneghetti.
            </p>
          </div>
          <InovamfBenefits />
        </div>
      </section>

      <section
        className="flex flex-col items-center gap-4 px-6 py-16 text-center text-white"
        style={{ background: "linear-gradient(135deg, #4A0E1A 0%, #D62027 55%, #F7941D 100%)" }}
      >
        <h2 className="text-xl font-semibold sm:text-2xl">Pronto para dar o primeiro passo?</h2>
        <p className="max-w-md text-sm text-white/90">
          Envie a ideia da sua equipe e comece a acompanhar cada etapa da jornada até o InovAMF.
        </p>
        <Button
          size="lg"
          className="bg-white text-brand-800 hover:bg-white/90"
          render={<Link href="/cadastro" />}
          nativeButton={false}
        >
          Enviar minha ideia
        </Button>
      </section>

      <LandingFooter />
    </div>
  );
}
