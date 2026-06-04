import type { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/auth.js";
import {
  getScoreboardHandler,
  healthHandler,
  listChallengesHandler,
  meHandler,
  scoreboardStreamHandler,
  submitFlagHandler,
} from "../controllers/api.controller.js";
import { env } from "../config/env.js";

export async function registerApiRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/health", healthHandler);

  // Public scoreboard (SSE + snapshot)
  fastify.get("/api/scoreboard", getScoreboardHandler);
  fastify.get("/api/scoreboard/stream", scoreboardStreamHandler);

  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook("preHandler", authenticate);

    protectedRoutes.get("/auth/me", meHandler);
    protectedRoutes.get("/challenges", listChallengesHandler);

    protectedRoutes.post("/submissions", {
      config: {
        rateLimit: {
          max: env.RATE_LIMIT_MAX,
          timeWindow: env.RATE_LIMIT_TIME_WINDOW_MS,
          keyGenerator: (request) => request.user.sub,
        },
      },
      handler: submitFlagHandler,
    });
  },);
}
