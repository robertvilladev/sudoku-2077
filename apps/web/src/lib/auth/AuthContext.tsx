import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface AuthState {
  accessToken: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// Token lives in memory only, on purpose: no localStorage/cookie persistence until Phase 1 ships a
// real refresh-token flow to build that on top of.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const value = useMemo<AuthState>(
    () => ({
      accessToken,
      login: (token: string) => setAccessToken(token),
      logout: () => setAccessToken(null),
    }),
    [accessToken]
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
