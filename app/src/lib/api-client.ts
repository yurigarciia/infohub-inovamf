// Cliente HTTP único para falar com o backend (server/). Todos os
// services em app/src/services/*.service.ts passam por aqui — nenhum
// faz `fetch` na mão.
//
// Responsabilidades:
//  - prefixar NEXT_PUBLIC_API_URL
//  - enviar/receber cookies (refresh token httpOnly)
//  - anexar o access token (Authorization: Bearer ...)
//  - no 401, tentar UMA vez POST /auth/refresh e repetir a requisição
//  - transformar erro do backend ({ error: { code, message } }) em Error

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

/** Access token em memória (não em localStorage — mitiga XSS). O
 * refresh vive num cookie httpOnly que o browser manda sozinho. */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  /** objeto -> JSON.stringify + header; FormData -> enviado como está */
  body?: unknown;
  /** não tentar refresh no 401 (usado pelo próprio /auth/refresh) */
  skipRefresh?: boolean;
}

async function rawFetch(path: string, opts: ApiFetchOptions): Promise<Response> {
  const headers = new Headers(opts.headers);
  let body: BodyInit | undefined;

  if (opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(opts.body);
  }

  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers,
    body,
    credentials: "include",
  });
}

export interface RefreshResult {
  accessToken: string;
  user: { id: string; name: string; email: string; role: string };
}

/** Refresh em andamento — compartilhado entre chamadas concorrentes.
 * Sem isso, dois 401 simultâneos (ou o refresh do SessionProvider ao
 * montar + um loader de tela) disparam dois POST /auth/refresh: o
 * segundo reapresenta um refresh token já rotacionado e o backend, que
 * trata reuso como roubo, derruba a sessão inteira. */
let inFlightRefresh: Promise<RefreshResult | null> | null = null;

async function doRefresh(): Promise<RefreshResult | null> {
  try {
    const res = await rawFetch("/auth/refresh", { method: "POST", skipRefresh: true });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<RefreshResult>;
    if (data.accessToken && data.user) {
      accessToken = data.accessToken;
      return { accessToken: data.accessToken, user: data.user };
    }
    return null;
  } catch {
    return null;
  }
}

/** Renova o access token a partir do cookie de refresh. Single-flight:
 * chamadas concorrentes recebem a mesma Promise. */
export function refreshSession(): Promise<RefreshResult | null> {
  if (!inFlightRefresh) {
    inFlightRefresh = doRefresh().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

async function refreshOnce(): Promise<boolean> {
  return (await refreshSession()) !== null;
}

export async function apiFetch<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  let res = await rawFetch(path, opts);

  if (res.status === 401 && !opts.skipRefresh) {
    const ok = await refreshOnce();
    if (ok) {
      res = await rawFetch(path, opts);
    } else {
      accessToken = null;
    }
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; fields?: never } })?.error;
    throw new ApiError(
      res.status,
      err?.code ?? "UNKNOWN",
      err?.message ?? `Erro ${res.status} ao chamar ${path}`,
      err?.fields,
    );
  }

  return data as T;
}
