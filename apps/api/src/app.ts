import "dotenv/config";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import { env } from "./config/env.js";
import { registerErrorHandler } from "./errors.js";
import { registerHealthRoute } from "./health.js";
import { buildOpenApiDocument } from "./openapi.js";
import { dailyChallengeRoutes } from "./routes/dailyChallenge.js";
import { puzzleRoutes } from "./routes/puzzles.js";
import { authRoutes } from "./routes/auth.js";
import { profileRoutes } from "./routes/profile.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email: string };
    user: { sub: string; email: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) => Promise<void>;
    optionalAuthenticate: (request: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) => Promise<void>;
  }
}

export async function buildApp() {
  const app = Fastify({
    logger: true,
    requestIdHeader: "x-request-id",
    genReqId: (req) => (req.headers["x-request-id"] as string) ?? randomUUID(),
  });

  registerErrorHandler(app);
  await app.register(helmet);
  await app.register(cors, {
    origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : false,
    credentials: true,
  });
  await app.register(rateLimit, { max: env.RATE_LIMIT_MAX, timeWindow: "1 minute" });
  await app.register(cookie);
  await app.register(jwt, { secret: env.JWT_ACCESS_SECRET, sign: { expiresIn: env.JWT_ACCESS_TTL } });
  // zod-to-openapi (openapi3-ts types) and @fastify/swagger (openapi-types) disagree on nominal
  // typing for an otherwise identical OpenAPI 3 document shape; the document itself is valid.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
  await app.register(swagger, { mode: "static", specification: { document: buildOpenApiDocument() as any } });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.decorate("authenticate", async (request, reply) => {
    await request.jwtVerify();
  });
  app.decorate("optionalAuthenticate", async (request) => {
    try {
      await request.jwtVerify();
    } catch {
      // anonymous — fine, route decides what to do without request.user
    }
  });

  registerHealthRoute(app);
  await app.register(dailyChallengeRoutes);
  await app.register(puzzleRoutes);
  await app.register(authRoutes);
  await app.register(profileRoutes);

  return app;
}
