"use client";

// Sessão real (B1). No mount tenta reidratar a partir do cookie de
// refresh (httpOnly) via POST /auth/refresh; `signIn` faz login de
// verdade e guarda o access token em memória (api-client). Os
// componentes que consomem useSession() continuam lendo `user`,
// `isLoading` e `signOut` como antes.
//
// `setUserId` ainda existe como atalho mockado, usado só pelo cadastro
// de equipe para "entrar como o líder recém-criado" — sai quando B3
// migrar teams.service para a API real.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  login as apiLogin,
  logout as apiLogout,
  refreshSession as apiRefresh,
} from "@/services/auth.service";
import { getMe, listUsers } from "@/services";
import type { User } from "@/types";

const MOCK_STORAGE_KEY = "infohub:mock-session-user-id";

interface SessionContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  /** @deprecated atalho mockado do cadastro de equipe — sai no B3. */
  setUserId: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const logged = await apiRefresh();
      if (cancelled) return;
      if (logged) {
        const me = await getMe();
        if (!cancelled) setUser(me);
      }
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<User> => {
    await apiLogin(email, password);
    const me = await getMe();
    if (!me) throw new Error("Não foi possível carregar o usuário.");
    setUser(me);
    return me;
  };

  const setUserId = async (nextUserId: string) => {
    window.localStorage.setItem(MOCK_STORAGE_KEY, nextUserId);
    const users = await listUsers();
    setUser(users.find((u) => u.id === nextUserId) ?? null);
  };

  const signOut = async () => {
    window.localStorage.removeItem(MOCK_STORAGE_KEY);
    await apiLogout();
    setUser(null);
  };

  return (
    <SessionContext.Provider value={{ user, isLoading, signIn, setUserId, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession precisa estar dentro de <SessionProvider>");
  return ctx;
}
