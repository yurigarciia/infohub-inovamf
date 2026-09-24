"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session";
import { requestPasswordReset } from "@/services";
import { ApiError } from "@/lib/api-client";
import { UserRole } from "@/types";
import { DemoProfilePicker } from "./demo-profile-picker";

/** RF-01: login real (B1) com e-mail e senha. A senha é verificada pelo
 * backend (POST /auth/login); o refresh token vem em cookie httpOnly e
 * o access token fica em memória (ver lib/api-client + services/auth). */
function LoginForm() {
  const router = useRouter();
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [helpMode, setHelpMode] = useState<null | "first-access" | "reset">(null);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);

  // ?next=/rota — só caminho interno (evita redirecionar para outro site)
  const rawNext = useSearchParams().get("next");
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("\\")
      ? rawNext
      : null;

  function goToUserArea(role: UserRole) {
    router.push(next ?? (role === UserRole.STUDENT ? "/aluno" : "/admin"));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await signIn(email, password);
      goToUserArea(user.role);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível entrar. Tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function openHelp(mode: "first-access" | "reset") {
    setHelpMode((cur) => (cur === mode ? null : mode));
    setRecoverySent(false);
  }

  async function handleRecovery(event: FormEvent) {
    event.preventDefault();
    // Mesmo endpoint para os dois casos: o backend decide a validade e o
    // texto do e-mail (7 dias no primeiro acesso, 1h no reset).
    await requestPasswordReset(recoveryEmail || email);
    setRecoverySent(true);
  }

  async function handleDemoPick(user: { role: UserRole }) {
    goToUserArea(user.role);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Image src="/logotipo.png" alt="InfoHub" width={48} height={48} />
          <CardTitle>Entrar no InfoHub</CardTitle>
          <CardDescription>Acesso de aluno, mentor ou administrador</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting} className="mt-1">
              {isSubmitting ? "Entrando…" : "Entrar"}
            </Button>

            <div className="flex justify-between text-sm">
              <button
                type="button"
                onClick={() => openHelp("first-access")}
                className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Primeiro acesso
              </button>
              <button
                type="button"
                onClick={() => openHelp("reset")}
                className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Esqueci minha senha
              </button>
            </div>
          </form>

          {helpMode && (
            <form className="mt-3 flex flex-col gap-2" onSubmit={handleRecovery}>
              <Label htmlFor="recovery-email" className="text-xs text-muted-foreground">
                {helpMode === "first-access"
                  ? "Você recebeu um e-mail de boas-vindas com um link para definir sua senha. Se não achou, informe seu e-mail para reenviar."
                  : "Informe seu e-mail e enviaremos um link para redefinir a senha, se houver conta."}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="recovery-email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                />
                <Button type="submit" variant="outline">
                  Enviar
                </Button>
              </div>
              {recoverySent && (
                <p className="text-xs text-muted-foreground">
                  Se o e-mail existir, o link foi enviado. Confira sua caixa de entrada.
                </p>
              )}
            </form>
          )}

          <DemoProfilePicker onPick={handleDemoPick} />
        </CardContent>
      </Card>
    </div>
  );
}

/** useSearchParams (?next=) exige um limite de Suspense na página. */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
