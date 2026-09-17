import { useMutation } from "@tanstack/react-query";
import { postJson } from "../../lib/apiClient.js";
import { useAuth } from "../../lib/auth/AuthContext.js";
import { AuthResponseSchema, type LoginRequest, type SignupRequest } from "@sudoku-2077/api-types";

export function useLogin() {
  const { login } = useAuth();
  return useMutation({
    mutationFn: (body: LoginRequest) => postJson("/api/auth/login", AuthResponseSchema, body),
    onSuccess: (data) => login(data.accessToken, data.user),
  });
}

export function useSignup() {
  const { login } = useAuth();
  return useMutation({
    mutationFn: (body: SignupRequest) => postJson("/api/auth/signup", AuthResponseSchema, body),
    onSuccess: (data) => login(data.accessToken, data.user),
  });
}

export function useLogout() {
  const { logout } = useAuth();
  return useMutation({ mutationFn: logout });
}
