import "dotenv/config";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import { env } from "./config/env.js";
import { registerErrorHandler } from "./errors.js";
import { registerHealthRoute } from "./health.js";
import { dailyChallengeRoutes } from "./routes/dailyChallenge.js";
import { puzzleRoutes } from "./routes/puzzles.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
    requestIdHeader: "x-request-id",
    genReqId: (req) => (req.headers["x-request-id"] as string) ?? randomUUID(),
  });

  registerErrorHandler(app);
  await app.register(helmet);
  await app.register(cors, { origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : false });
  await app.register(rateLimit, { max: env.RATE_LIMIT_MAX, timeWindow: "1 minute" });

  registerHealthRoute(app);
  await app.register(dailyChallengeRoutes);
  await app.register(puzzleRoutes);

  return app;
}
