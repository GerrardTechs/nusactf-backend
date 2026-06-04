import type { FastifyInstance } from "fastify";
import { registerWarungLoginRoutes } from "../challenges/warung-login/index.js";
import { registerPesanRahasiaRoutes } from "../challenges/pesan-rahasia/index.js";
import { registerFotoKenanganRoutes } from "../challenges/foto-kenangan/index.js";

export async function registerChallengeRoutes(
  fastify: FastifyInstance
): Promise<void> {
  await fastify.register(
    async (challengeApp) => {
      await registerWarungLoginRoutes(challengeApp);
      await registerPesanRahasiaRoutes(challengeApp);
      await registerFotoKenanganRoutes(challengeApp);
    },
    { prefix: "/api/challenges" }
  );
}
