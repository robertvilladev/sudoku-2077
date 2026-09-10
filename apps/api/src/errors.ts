import type { FastifyError, FastifyInstance } from "fastify";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    if (statusCode >= 500) {
      request.log.error(error);
      reply.code(500).send({ error: "Internal server error" });
      return;
    }
    reply.code(statusCode).send({ error: error.message });
  });
}
