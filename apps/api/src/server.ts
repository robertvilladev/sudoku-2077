import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import { env } from "./config/env.js";
import { registerErrorHandler } from "./errors.js";
import { dailyChallengeRoutes } from "./routes/dailyChallenge.js";
import { puzzleRoutes } from "./routes/puzzles.js";

const app = Fastify({ logger: true });

registerErrorHandler(app);
await app.register(helmet);
await app.register(cors, { origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : false });
await app.register(rateLimit, { max: env.RATE_LIMIT_MAX, timeWindow: "1 minute" });

app.get("/health", async () => ({ status: "ok" }));
await app.register(dailyChallengeRoutes);
await app.register(puzzleRoutes);

const port = env.PORT;

try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
