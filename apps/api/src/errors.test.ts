import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerErrorHandler } from "./errors.js";

describe("registerErrorHandler", () => {
  it("returns a 500 with a consistent { error } shape for unexpected exceptions", async () => {
    const app = Fastify();
    registerErrorHandler(app);
    app.get("/boom", async () => {
      throw new Error("kaboom");
    });

    const response = await app.inject({ method: "GET", url: "/boom" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "Internal server error" });
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
    expect(response.json()).toEqual({ error: "bad input" });
  });
});
