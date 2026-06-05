import type { FastifyReply, FastifyRequest } from "fastify";
import { isAppError } from "../utils/errors.js";

function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = extractBearerToken(request);

  if (!token) {
    reply.code(401).send({
      error: "Unauthorized",
      code: "MISSING_TOKEN",
      message: "Header Authorization Bearer diperlukan.",
    });
    return;
  }

  try {
    // ✅ Verifikasi lewat Supabase — handle ES256 otomatis
    const { data, error } = await request.server.supabase.auth.getUser(token);

    if (error || !data.user) {
      reply.code(401).send({
        error: "Unauthorized",
        code: "INVALID_TOKEN",
        message: "Token tidak valid atau sudah kedaluwarsa.",
      });
      return;
    }

    // ✅ Set manual ke request.user
    request.user = {
      sub: data.user.id,
      email: data.user.email ?? "",
    };

  } catch (err) {
    request.server.log.warn({ err }, "Auth failed");
    reply.code(401).send({
      error: "Unauthorized",
      code: "INVALID_TOKEN",
      message: "Token tidak valid atau sudah kedaluwarsa.",
    });
  }
}

export function handleControllerError(
  reply: FastifyReply,
  error: unknown
): FastifyReply {
  if (isAppError(error)) {
    return reply.code(error.statusCode).send({
      error: error.name,
      code: error.code,
      message: error.message,
    });
  }

  console.error("[Unhandled error]", error);
  return reply.code(500).send({
    error: "Internal Server Error",
    code: "INTERNAL_ERROR",
    message: "Terjadi kesalahan pada server.",
  });
}