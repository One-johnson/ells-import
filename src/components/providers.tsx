"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const AUTH_KEY = "ells-import-session";

type AuthContextValue = {
  sessionToken: string | null;
  setSessionToken: (token: string | null) => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionToken, setState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      setState(typeof window !== "undefined" ? localStorage.getItem(AUTH_KEY) : null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setSessionToken = useCallback((token: string | null) => {
    setState(token);
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem(AUTH_KEY, token);
      else localStorage.removeItem(AUTH_KEY);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ sessionToken, setSessionToken, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </ConvexProvider>
  );
}
