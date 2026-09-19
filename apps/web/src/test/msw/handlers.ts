import { http, HttpResponse } from "msw";
import {
  AuthResponseSchema,
  CompletionsResponseSchema,
  DailyChallengeResponseSchema,
  PublicPuzzleSchema,
  ValidatePuzzleResponseSchema,
} from "@sudoku-2077/api-types";

const API_BASE_URL = "http://localhost:3000";

// Mirrors apps/api's response shapes, validated through the same schemas the real routes use, so
// these fixtures can't silently drift from the real contract.
const samplePuzzle = PublicPuzzleSchema.parse({
  id: "puzzle-1",
  givens: "0".repeat(81),
  difficulty: "EASY",
  difficultyScore: 10,
  givensCount: 30,
  createdAt: new Date("2026-01-01T00:00:00Z").toISOString(),
});

export const handlers = [
  http.get(`${API_BASE_URL}/api/daily-challenge`, () =>
    HttpResponse.json(DailyChallengeResponseSchema.parse({ date: "2026-01-01", puzzle: samplePuzzle }))
  ),

  http.get(`${API_BASE_URL}/api/puzzles`, () => HttpResponse.json(samplePuzzle)),

  http.get(`${API_BASE_URL}/api/puzzles/:id`, () => HttpResponse.json(samplePuzzle)),

  http.post(`${API_BASE_URL}/api/puzzles/:id/validate`, () =>
    HttpResponse.json(ValidatePuzzleResponseSchema.parse({ correct: true, completed: true }))
  ),

  // Provisional Phase 1 endpoints — mocked so web development isn't blocked on the backend.
  http.post(`${API_BASE_URL}/api/auth/login`, () =>
    HttpResponse.json(
      AuthResponseSchema.parse({
        accessToken: "test-token",
        user: { id: "user-1", email: "player@example.com" },
      })
    )
  ),
  http.post(`${API_BASE_URL}/api/auth/signup`, () =>
    HttpResponse.json(
      AuthResponseSchema.parse({
        accessToken: "test-token",
        user: { id: "user-1", email: "player@example.com" },
      })
    )
  ),
  http.get(`${API_BASE_URL}/api/profile/completions`, () =>
    HttpResponse.json(CompletionsResponseSchema.parse([]))
  ),

  // No refresh cookie by default — tests that need a restored session override this with server.use().
  http.post(`${API_BASE_URL}/api/auth/refresh`, () =>
    HttpResponse.json({ error: "Invalid refresh token" }, { status: 401 })
  ),

  http.post(`${API_BASE_URL}/api/auth/logout`, () => new HttpResponse(null, { status: 204 })),
];
