// Autenticação (RF-01) — fala com o backend (server/) via api-client.
// Substitui o "login mockado" da fase anterior (T-FE-06).

import { apiFetch, setAccessToken } from "@/lib/api-client";
import type { UserRole } from "@/types";

export interface LoggedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface LoginResponse {
  accessToken: string;
  user: LoggedUser;
}

/** POST /auth/login — guarda o access token em memória e devolve o usuário. */
export async function login(email: string, password: string): Promise<LoggedUser> {
  const data = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    skipRefresh: true,
  });
  setAccessToken(data.accessToken);
  return data.user;
}

/** POST /auth/logout — revoga o refresh token e limpa o access token local. */
export async function logout(): Promise<void> {
  try {
    await apiFetch<void>("/auth/logout", { method: "POST", skipRefresh: true });
  } finally {
    setAccessToken(null);
  }
}

/** POST /auth/refresh — usado pelo SessionProvider ao carregar a app,
 * para reidratar a sessão a partir do cookie httpOnly. */
export async function refreshSession(): Promise<LoggedUser | null> {
  try {
    const data = await apiFetch<LoginResponse>("/auth/refresh", {
      method: "POST",
      skipRefresh: true,
    });
    setAccessToken(data.accessToken);
    return data.user;
  } catch {
    setAccessToken(null);
    return null;
  }
}

/** RF-01 — "esqueci minha senha", passo 1. Sempre resolve (não vaza se o e-mail existe). */
export async function requestPasswordReset(email: string): Promise<void> {
  await apiFetch<void>("/auth/password-reset", {
    method: "POST",
    body: { email },
    skipRefresh: true,
  });
}

/** RF-01 — "esqueci minha senha", passo 2. */
export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  await apiFetch<void>("/auth/password-reset/confirm", {
    method: "POST",
    body: { token, newPassword },
    skipRefresh: true,
  });
}
