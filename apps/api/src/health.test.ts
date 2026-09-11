import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerHealthRoute } from "./health.js";

describe("GET /health", () => {
  it("returns 200 when the DB check succeeds", async () => {
    const app = Fastify();
    registerHealthRoute(app, { checkDb: async () => true });
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("returns 503 when the DB check fails", async () => {
    const app = Fastify();
    registerHealthRoute(app, {
      checkDb: async () => {
        throw new Error("connection refused");
      },
    });
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: "error", error: "Database unavailable" });
  });
});
