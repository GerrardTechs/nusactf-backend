import type { FastifyReply, FastifyRequest } from "fastify";
import { isAppError } from "../utils/errors.js";

function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim();
}

/** Validates Supabase JWT on protected routes. */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = extractBearerToken(request);

  request.server.log.info({ token: token?.slice(0, 20) }, "incoming token prefix");

  if (!token) {
    reply.code(401).send({
      error: "Unauthorized",
      code: "MISSING_TOKEN",
      message: "Header Authorization Bearer diperlukan.",
    });
    return;
  }

  try {
    await request.jwtVerify();
  } catch (err) {
    // Tambah log ini sementara
    request.server.log.warn({ err }, "JWT verify failed");
    
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
