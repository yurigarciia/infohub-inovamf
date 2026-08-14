"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session";
import { authenticateByEmail } from "@/services";
import { UserRole } from "@/types";

/** RF-01: login (mock) com e-mail e senha, com opção de recuperação de
 * senha. Nesta fase a senha não é verificada de fato — só a existência
 * da conta pelo e-mail (ver services/users.service.authenticateByEmail). */
export default function LoginPage() {
  const router = useRouter();
  const { setUserId } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await authenticateByEmail(email, password);
      if (!user) {
        setError("E-mail ou senha inválidos.");
        return;
      }
      setUserId(user.id);
      router.push(user.role === UserRole.STUDENT ? "/aluno" : "/admin");
    } finally {
      setIsSubmitting(false);
    }
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

            <button
              type="button"
              onClick={() => setShowRecovery((v) => !v)}
              className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Esqueci minha senha
            </button>
            {showRecovery && (
              <p className="text-xs text-muted-foreground">
                Em produção, isso enviaria um e-mail de redefinição via Resend
                (ver decisoes.md, Q7). Nesta fase de frontend mockado, a
                senha não é verificada de fato.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
