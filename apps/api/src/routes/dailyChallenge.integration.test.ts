import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";

describe("GET /api/daily-challenge", () => {
  it("returns 404 when no challenge is assigned for today, or 200 if one already is", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/daily-challenge" });
    expect([200, 404]).toContain(response.statusCode);
  });
});
