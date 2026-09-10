"use client";

// Sessão real (B1/B3). No mount tenta reidratar a partir do cookie de
// refresh (httpOnly) via POST /auth/refresh; `signIn` faz login de
// verdade e guarda o access token em memória (api-client). Os
// componentes que consomem useSession() continuam lendo `user`,
// `isLoading` e `signOut` como antes.

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
import { getMe } from "@/services";
import type { User } from "@/types";

interface SessionContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  /** Reidrata a sessão a partir do access token já em memória — usado
   * pelo cadastro de equipe, que autentica o líder via POST /teams. */
  hydrate: () => Promise<User | null>;
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

  const hydrate = async (): Promise<User | null> => {
    const me = await getMe();
    setUser(me);
    return me;
  };

  const signOut = async () => {
    await apiLogout();
    setUser(null);
  };

  return (
    <SessionContext.Provider value={{ user, isLoading, signIn, hydrate, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession precisa estar dentro de <SessionProvider>");
  return ctx;
}
