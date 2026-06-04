import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(rateLimit, {
    global: false,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME_WINDOW_MS,
    errorResponseBuilder: (_request, context) => ({
      error: "Too Many Requests",
      code: "RATE_LIMIT_EXCEEDED",
      message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(context.ttl / 1000)} detik.`,
      statusCode: 429,
    }),
  });
});
