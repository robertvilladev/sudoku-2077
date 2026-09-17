import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { z } from "zod";
import { AuthResponseSchema } from "@sudoku-2077/api-types";
import { bearerHeaders, postJson } from "../apiClient.js";

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isInitializing: boolean;
  login: (accessToken: string, user: AuthUser) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Restore a session from the httpOnly refresh cookie on load — the access token itself is
  // memory-only, but the refresh cookie survives a page reload, so this avoids logging the
  // user out on every refresh even though their server-side session is still valid.
  useEffect(() => {
    let cancelled = false;
    postJson("/api/auth/refresh", AuthResponseSchema, undefined)
      .then((data) => {
        if (cancelled) return;
        setAccessToken(data.accessToken);
        setUser(data.user);
      })
      .catch(() => {
        // No valid refresh cookie — stay logged out.
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      accessToken,
      user,
      isInitializing,
      login: (token, nextUser) => {
        setAccessToken(token);
        setUser(nextUser);
      },
      logout: async () => {
        const token = accessToken;
        setAccessToken(null);
        setUser(null);
        if (token) {
          // Best-effort revoke — a failed logout call shouldn't trap the user in a logged-in UI.
          await postJson("/api/auth/logout", z.void(), undefined, { headers: bearerHeaders(token) }).catch(
            () => {}
          );
        }
      },
    }),
    [accessToken, user, isInitializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook belongs with its context/provider
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
