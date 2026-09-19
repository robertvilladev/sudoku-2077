import { useQuery } from "@tanstack/react-query";
import { bearerHeaders, getJson } from "../../lib/apiClient.js";
import { useAuth } from "../../lib/auth/AuthContext.js";
import { CompletionsResponseSchema } from "@sudoku-2077/api-types";

export function useCompletions() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["completions"],
    queryFn: () =>
      getJson("/api/profile/completions", CompletionsResponseSchema, { headers: bearerHeaders(accessToken) }),
    enabled: Boolean(accessToken),
  });
}
