import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerErrorHandler } from "./errors.js";

describe("registerErrorHandler", () => {
  it("returns a 500 with a consistent { code, error } shape for unexpected exceptions", async () => {
    const app = Fastify();
    registerErrorHandler(app);
    app.get("/boom", async () => {
      throw new Error("kaboom");
    });

    const response = await app.inject({ method: "GET", url: "/boom" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ code: "INTERNAL_ERROR", error: "Internal server error" });
  });

  it("preserves the status code of errors that set one (e.g. Fastify validation errors)", async () => {
    const app = Fastify();
    registerErrorHandler(app);
    app.get("/typed", async () => {
      const err = Object.assign(new Error("bad input"), { statusCode: 400 });
      throw err;
    });

    const response = await app.inject({ method: "GET", url: "/typed" });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ code: "BAD_REQUEST", error: "bad input" });
  });

  it.each([
    [401, "UNAUTHORIZED"],
    [404, "NOT_FOUND"],
    [429, "RATE_LIMITED"],
  ])("maps a thrown %i to %s", async (statusCode, code) => {
    const app = Fastify();
    registerErrorHandler(app);
    app.get("/typed", async () => {
      throw Object.assign(new Error("nope"), { statusCode });
    });

    const response = await app.inject({ method: "GET", url: "/typed" });

    expect(response.statusCode).toBe(statusCode);
    expect(response.json()).toEqual({ code, error: "nope" });
  });

  it("answers unknown routes with the same shape", async () => {
    const app = Fastify();
    registerErrorHandler(app);

    const response = await app.inject({ method: "GET", url: "/nowhere" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: "NOT_FOUND", error: "Route GET /nowhere not found" });
  });
});
