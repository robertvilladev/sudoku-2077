import { useQuery } from "@tanstack/react-query";
import { getJson } from "../../lib/apiClient.js";
import { useAuth } from "../../lib/auth/AuthContext.js";
import { CompletionsResponseSchema } from "./types.js";

export function useCompletions() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["completions"],
    queryFn: () =>
      getJson("/api/profile/completions", CompletionsResponseSchema, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    enabled: Boolean(accessToken),
  });
}
