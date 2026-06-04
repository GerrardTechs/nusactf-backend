import Fastify from "fastify";
import corsPlugin from "./plugins/cors.js";
import jwtPlugin from "./plugins/jwt.js";
import supabasePlugin from "./plugins/supabase.js";
import rateLimitPlugin from "./plugins/rate-limit.js";
import { registerApiRoutes } from "./routes/api.routes.js";
import { registerChallengeRoutes } from "./routes/challenges.routes.js";
import { isAppError } from "./utils/errors.js";

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
    },
  });

  await fastify.register(corsPlugin);
  await fastify.register(jwtPlugin);
  await fastify.register(supabasePlugin);
  await fastify.register(rateLimitPlugin);

  await fastify.register(async (apiInstance) => {
    await apiInstance.register(registerApiRoutes);
    await apiInstance.register(registerChallengeRoutes);
  }, { prefix: '/api' });
  
  fastify.setErrorHandler((error, _request, reply) => {
    if (isAppError(error)) {
      return reply.code(error.statusCode).send({
        error: error.name,
        code: error.code,
        message: error.message,
      });
    }

    fastify.log.error(error);
    return reply.code(500).send({
      error: "Internal Server Error",
      code: "INTERNAL_ERROR",
      message: "Terjadi kesalahan pada server.",
    });
  });

  return fastify;
}
