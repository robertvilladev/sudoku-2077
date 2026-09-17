import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { prisma } from "../db/client.js";

const email = `auth-test-${randomUUID()}@example.com`;
const password = "hunter2222";

afterEach(async () => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});

function cookieValue(setCookieHeader: string | string[] | undefined, name: string): string | undefined {
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
  const match = headers.find((h) => h.startsWith(`${name}=`));
  return match?.split(";")[0]?.split("=")[1];
}

describe("POST /api/auth/signup", () => {
  it("creates a user and returns an access token + refresh cookie", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "POST", url: "/api/auth/signup", payload: { email, password } });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.user).toEqual({ id: expect.any(String), email });
    expect(cookieValue(response.headers["set-cookie"], "refreshToken")).toBeTruthy();
  });

  it("rejects a duplicate email with 409", async () => {
    const app = await buildApp();
    await app.inject({ method: "POST", url: "/api/auth/signup", payload: { email, password } });
    const response = await app.inject({ method: "POST", url: "/api/auth/signup", payload: { email, password } });
    expect(response.statusCode).toBe(409);
  });

  it("rejects a short password with 400", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: { email: `short-${randomUUID()}@example.com`, password: "short" },
    });
    expect(response.statusCode).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials", async () => {
    const app = await buildApp();
    await app.inject({ method: "POST", url: "/api/auth/signup", payload: { email, password } });
    const response = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password } });
    expect(response.statusCode).toBe(200);
    expect(response.json().accessToken).toEqual(expect.any(String));
  });

  it("rejects a wrong password with a generic 401", async () => {
    const app = await buildApp();
    await app.inject({ method: "POST", url: "/api/auth/signup", payload: { email, password } });
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password: "wrong-password" },
    });
    expect(response.statusCode).toBe(401);
  });

  it("rejects an unknown email with the same generic 401", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: `nobody-${randomUUID()}@example.com`, password },
    });
    expect(response.statusCode).toBe(401);
  });
});

describe("POST /api/auth/refresh", () => {
  it("rotates the refresh token and issues a new access token", async () => {
    const app = await buildApp();
    const signup = await app.inject({ method: "POST", url: "/api/auth/signup", payload: { email, password } });
    const oldCookie = cookieValue(signup.headers["set-cookie"], "refreshToken")!;

    const refresh = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      cookies: { refreshToken: oldCookie },
    });
    expect(refresh.statusCode).toBe(200);
    expect(refresh.json().accessToken).toEqual(expect.any(String));
    const newCookie = cookieValue(refresh.headers["set-cookie"], "refreshToken");
    expect(newCookie).toBeTruthy();
    expect(newCookie).not.toBe(oldCookie);

    // Reusing the now-revoked old token must fail.
    const reuse = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      cookies: { refreshToken: oldCookie },
    });
    expect(reuse.statusCode).toBe(401);
  });

  it("rejects a missing refresh cookie with 401", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "POST", url: "/api/auth/refresh" });
    expect(response.statusCode).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("revokes the refresh token and clears the cookie", async () => {
    const app = await buildApp();
    const signup = await app.inject({ method: "POST", url: "/api/auth/signup", payload: { email, password } });
    const accessToken = signup.json().accessToken;
    const refreshCookie = cookieValue(signup.headers["set-cookie"], "refreshToken")!;

    const logout = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: { authorization: `Bearer ${accessToken}` },
      cookies: { refreshToken: refreshCookie },
    });
    expect(logout.statusCode).toBe(204);

    const reuse = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      cookies: { refreshToken: refreshCookie },
    });
    expect(reuse.statusCode).toBe(401);
  });
});
