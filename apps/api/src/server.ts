import "dotenv/config";
import Fastify from "fastify";
import { dailyChallengeRoutes } from "./routes/dailyChallenge.js";
import { puzzleRoutes } from "./routes/puzzles.js";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok" }));
await app.register(dailyChallengeRoutes);
await app.register(puzzleRoutes);

const port = Number(process.env.PORT ?? 3000);

try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
