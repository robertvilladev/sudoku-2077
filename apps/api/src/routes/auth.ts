import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import type { FastifyInstance, FastifyReply } from "fastify";
import { LoginRequestSchema, SignupRequestSchema } from "@sudoku-2077/api-types";
import type { AuthResponse } from "@sudoku-2077/api-types";
import { prisma } from "../db/client.js";
import { env } from "../config/env.js";
import { generateRefreshToken, hashRefreshToken } from "../lib/refreshToken.js";

const BCRYPT_ROUNDS = 12;
const REFRESH_COOKIE_NAME = "refreshToken";

function refreshCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/api/auth",
    maxAge: maxAgeSeconds,
  };
}

async function issueTokens(app: FastifyInstance, reply: FastifyReply, user: { id: string; email: string }) {
  const accessToken = app.jwt.sign({ sub: user.id, email: user.email });

  const refreshToken = generateRefreshToken();
  const ttlMs = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  await prisma.refreshToken.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
  reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions(ttlMs / 1000));

  const response: AuthResponse = { accessToken, user: { id: user.id, email: user.email } };
  return response;
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/signup", async (request, reply) => {
    const parsed = SignupRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "Body must be { email, password (min 8 chars) }" };
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      reply.code(409);
      return { error: "An account with that email already exists" };
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { id: randomUUID(), email: parsed.data.email, passwordHash },
    });

    return issueTokens(app, reply, user);
  });

  app.post("/api/auth/login", async (request, reply) => {
    const parsed = LoginRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "Body must be { email, password }" };
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    const passwordMatches = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
    if (!user || !passwordMatches) {
      reply.code(401);
      return { error: "Invalid email or password" };
    }

    return issueTokens(app, reply, user);
  });

  app.post("/api/auth/refresh", async (request, reply) => {
    const cookieToken = request.cookies[REFRESH_COOKIE_NAME];
    if (!cookieToken) {
      reply.code(401);
      return { error: "Missing refresh token" };
    }

    const tokenHash = hashRefreshToken(cookieToken);
    const stored = await prisma.refreshToken.findFirst({ where: { tokenHash } });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      reply.code(401);
      return { error: "Invalid or expired refresh token" };
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) {
      reply.code(401);
      return { error: "Invalid or expired refresh token" };
    }

    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    return issueTokens(app, reply, user);
  });

  app.post("/api/auth/logout", { preHandler: app.authenticate }, async (request, reply) => {
    const cookieToken = request.cookies[REFRESH_COOKIE_NAME];
    if (cookieToken) {
      const tokenHash = hashRefreshToken(cookieToken);
      await prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revoked: true } });
    }
    reply.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
    reply.code(204);
  });
}
