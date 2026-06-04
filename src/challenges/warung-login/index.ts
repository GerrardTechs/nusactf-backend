import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { attemptWarungLogin } from "./sandbox.js";
import { handleControllerError } from "../../middlewares/auth.js";

const loginSchema = z.object({
  username: z.string().max(200),
  password: z.string().max(200),
});

export async function registerWarungLoginRoutes(
  fastify: FastifyInstance
): Promise<void> {
  fastify.post("/warung-login", async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);
      const result = attemptWarungLogin(body);

      return reply.send({
        success: result.success,
        message: result.message,
        ...(result.success ? { flag: result.flag } : {}),
        ...(process.env.NODE_ENV === "development"
          ? { debugQuery: result.debugQuery }
          : {}),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: "Validation Error",
          code: "INVALID_INPUT",
          message: error.errors[0]?.message ?? "Input tidak valid.",
        });
      }
      return handleControllerError(reply, error);
    }
  });

  fastify.get("/warung-login", async (_request, reply) => {
    return reply.send({
      title: "Warung Login",
      description:
        "Endpoint sandbox SQLi terisolasi. Kirim POST dengan username & password.",
      hint: "Coba payload klasik: username = ' OR '1'='1",
    });
  });
}
