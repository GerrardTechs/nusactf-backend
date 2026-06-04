import type { FastifyInstance } from "fastify";
import { CAESAR_SHIFT, ENCRYPTED_TEXT } from "./constants.js";

export async function registerPesanRahasiaRoutes(
  fastify: FastifyInstance
): Promise<void> {
  fastify.get("/pesan-rahasia", async (_request, reply) => {
    return reply.send({
      title: "Pesan Rahasia",
      encryptedText: ENCRYPTED_TEXT,
      cipher: "Caesar",
      shiftHint: `Shift = ${CAESAR_SHIFT}`,
      instructions:
        "Dekripsi teks di atas, lalu submit flag plaintext melalui POST /api/submissions.",
    });
  });
}
