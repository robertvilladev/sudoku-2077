import type { FastifyInstance } from "fastify";
import { prisma } from "./db/client.js";

export function registerHealthRoute(
  app: FastifyInstance,
  deps: { checkDb: () => Promise<unknown> } = { checkDb: () => prisma.$queryRaw`SELECT 1` }
): void {
  app.get("/health", async (_request, reply) => {
    try {
      await deps.checkDb();
      return { status: "ok" };
    } catch (err) {
      app.log.error(err);
      reply.code(503);
      return { status: "error", error: "Database unavailable" };
    }
  });
}
