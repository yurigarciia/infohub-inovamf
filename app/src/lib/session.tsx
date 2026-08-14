"use client";

// Sessão mockada (T-FE-05): substitui o login real enquanto ele não
// existe (T-FE-06). Guarda qual usuário está "logado" em localStorage,
// e resolve o User completo via services/ (nunca importa mocks direto).
// Quando o login real existir, este provider some e vira apenas o
// resultado da autenticação de fato — os componentes que consomem
// useSession() não precisam mudar.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { listUsers } from "@/services";
import type { User } from "@/types";

const STORAGE_KEY = "infohub:mock-session-user-id";

interface SessionContextValue {
  user: User | null;
  users: User[];
  isLoading: boolean;
  setUserId: (userId: string) => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listUsers().then((loaded) => {
      if (cancelled) return;
      setUsers(loaded);
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const initial = stored && loaded.some((u) => u.id === stored) ? stored : null;
      setUserIdState(initial);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setUserId = (nextUserId: string) => {
    setUserIdState(nextUserId);
    window.localStorage.setItem(STORAGE_KEY, nextUserId);
  };

  const signOut = () => {
    setUserIdState(null);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const user = useMemo(() => users.find((u) => u.id === userId) ?? null, [users, userId]);

  return (
    <SessionContext.Provider value={{ user, users, isLoading, setUserId, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession precisa estar dentro de <SessionProvider>");
  return ctx;
}
