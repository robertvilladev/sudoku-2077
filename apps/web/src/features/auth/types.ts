import { z } from "zod";

// Provisional contract for the Phase 1 auth endpoints, which don't exist in @sudoku-2077/api-types
// yet (Phase 1 is unbuilt). Replace these with the real exports once Phase 1 ships, matching
// whatever shape ROADMAP.md's SignupRequest/LoginRequest/AuthResponse DTOs end up having.
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const SignupRequestSchema = LoginRequestSchema;
export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({ id: z.string(), email: z.string().email() }),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
