import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { server } from "../test/msw/server.js";
import { ApiError, getJson } from "./apiClient.js";

describe("apiClient", () => {
  it("parses a successful response against the given schema", async () => {
    const result = await getJson(
      "/api/daily-challenge",
      z.object({ date: z.string(), puzzle: z.object({ id: z.string() }).passthrough() })
    );
    expect(result.date).toBe("2026-01-01");
  });

  it("throws an ApiError carrying the server's message and status on failure", async () => {
    server.use(
      http.get("http://localhost:3000/api/puzzles/missing", () =>
        HttpResponse.json({ error: "Puzzle not found" }, { status: 404 })
      )
    );

    const error: unknown = await getJson("/api/puzzles/missing", z.unknown()).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe("Puzzle not found");
    expect((error as ApiError).status).toBe(404);
  });
});
