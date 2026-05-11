"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { PublicUser } from "@convex/lib/publicUser";
import type { Id } from "@convex/_generated/dataModel";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { clearSessionToken, getSessionToken, setSessionToken } from "@/lib/sessionToken";
import { toast } from "sonner";
import { clearGuestCart, readGuestCart } from "@/lib/guestCart";

function mutationErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

type AuthContextValue = {
  sessionToken: string | null;
  user: PublicUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, profileImageId?: Id<"_storage">) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionToken, setSessionTokenState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  /** Until `auth.me` resolves after a fresh login/register */
  const [pendingUser, setPendingUser] = useState<PublicUser | null>(null);
  const [guestMergeAttempted, setGuestMergeAttempted] = useState(false);

  const loginMut = useMutation(api.auth.login);
  const registerMut = useMutation(api.auth.register);
  const logoutMut = useMutation(api.auth.logout);
  const mergeGuestMut = useMutation(api.cart.mergeGuestLines);

  const me = useQuery(
    api.auth.me,
    sessionToken ? { sessionToken } : "skip",
  );

  useEffect(() => {
    setSessionTokenState(getSessionToken());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (me?.user) {
      setPendingUser(null);
    }
  }, [me?.user]);

  useEffect(() => {
    if (!hydrated || !sessionToken) {
      return;
    }
    if (me === null) {
      setSessionTokenState(null);
      setPendingUser(null);
      setGuestMergeAttempted(false);
      clearSessionToken();
    }
  }, [hydrated, sessionToken, me]);

  useEffect(() => {
    if (!hydrated || !sessionToken || guestMergeAttempted) {
      return;
    }
    const lines = readGuestCart();
    if (lines.length === 0) {
      setGuestMergeAttempted(true);
      return;
    }
    // Fire-and-forget; even if merge fails, don't block auth.
    void (async () => {
      try {
        await mergeGuestMut({
          sessionToken,
          lines: lines.map((l) => ({ productId: l.productId as Id<"products">, quantity: l.quantity })),
        });
        clearGuestCart();
      } catch {
        // Keep guest cart if merge fails.
      } finally {
        setGuestMergeAttempted(true);
      }
    })();
  }, [hydrated, sessionToken, guestMergeAttempted, mergeGuestMut]);

  const user = me?.user ?? pendingUser ?? null;

  const isLoading =
    !hydrated || (Boolean(sessionToken) && me === undefined && !pendingUser);

  const isAuthenticated = Boolean(sessionToken && user);
  const isAdmin = user?.role === "admin";

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await loginMut({ email, password });
        setSessionToken(res.sessionToken);
        setSessionTokenState(res.sessionToken);
        setPendingUser(res.user);
        setGuestMergeAttempted(false);
      } catch (e) {
        toast.error(mutationErrorMessage(e));
        throw e;
      }
    },
    [loginMut],
  );

  const register = useCallback(
    async (email: string, password: string, name?: string, profileImageId?: Id<"_storage">) => {
      try {
        const res = await registerMut({ email, password, name, profileImageId });
        setSessionToken(res.sessionToken);
        setSessionTokenState(res.sessionToken);
        setPendingUser(res.user);
        setGuestMergeAttempted(false);
      } catch (e) {
        toast.error(mutationErrorMessage(e));
        throw e;
      }
    },
    [registerMut],
  );

  const logout = useCallback(async () => {
    const token = sessionToken;
    if (!token) {
      clearSessionToken();
      setSessionTokenState(null);
      setPendingUser(null);
      return;
    }
    try {
      await logoutMut({ sessionToken: token });
    } finally {
      clearSessionToken();
      setSessionTokenState(null);
      setPendingUser(null);
    }
  }, [sessionToken, logoutMut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      sessionToken,
      user,
      isLoading,
      isAuthenticated,
      isAdmin,
      login,
      register,
      logout,
    }),
    [
      sessionToken,
      user,
      isLoading,
      isAuthenticated,
      isAdmin,
      login,
      register,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
