import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { fetchProfileById } from "../services/auth.service.js";
import {
  listPublicChallenges,
  submitFlag,
} from "../services/submission.service.js";
import {
  fetchScoreboard,
  fetchUserSolves,
} from "../services/scoreboard.service.js";
import { scoreboardEvents } from "../services/scoreboard-events.js";
import { handleControllerError } from "../middlewares/auth.js";
import { env } from "../config/env.js";

const submissionSchema = z.object({
  challenge_id: z.string().uuid("challenge_id harus UUID valid."),
  flag: z
    .string()
    .min(1, "Flag wajib diisi.")
    .max(256, "Flag terlalu panjang."),
});

export async function healthHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  return reply.send({
    status: "ok",
    service: "nusactf-backend",
    timestamp: new Date().toISOString(),
  });
}

export async function meHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const profile = await fetchProfileById(request.server.supabase, request.user.sub);
    return reply.send({ profile });
  } catch (error) {
    return handleControllerError(reply, error);
  }
}

export async function listChallengesHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const [challenges, solves] = await Promise.all([
      listPublicChallenges(request.server.supabase),
      fetchUserSolves(request.server.supabase, request.user.sub),
    ]);

    const solvedIds = new Set(solves.map((solve) => solve.challenge_id));

    return reply.send({
      challenges: challenges.map((challenge) => ({
        ...challenge,
        solved: solvedIds.has(challenge.id),
        solvedAt:
          solves.find((solve) => solve.challenge_id === challenge.id)?.solved_at ??
          null,
      })),
    });
  } catch (error) {
    return handleControllerError(reply, error);
  }
}

export async function submitFlagHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const body = submissionSchema.parse(request.body);
    const result = await submitFlag(request.server.supabase, request.user.sub, {
      challengeId: body.challenge_id,
      flag: body.flag,
    });

    return reply.send(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        error: "Validation Error",
        code: "INVALID_INPUT",
        message: error.errors[0]?.message ?? "Input tidak valid.",
        details: error.flatten(),
      });
    }
    return handleControllerError(reply, error);
  }
}

export async function getScoreboardHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const scoreboard = await fetchScoreboard(request.server.supabase);
    return reply.send({ scoreboard });
  } catch (error) {
    return handleControllerError(reply, error);
  }
}

export async function scoreboardStreamHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const sendEvent = (event: string, data: unknown) => {
    reply.raw.write(`event: ${event}\n`);
    reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const sendScoreboard = async () => {
    const scoreboard = await fetchScoreboard(request.server.supabase);
    sendEvent("scoreboard", { scoreboard });
  };

  const heartbeat = setInterval(() => {
    reply.raw.write(": heartbeat\n\n");
  }, env.RATE_LIMIT_TIME_WINDOW_MS / 2);

  const unsubscribe = scoreboardEvents.onUpdate((payload) => {
    sendEvent("scoreboard", payload);
  });

  request.raw.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });

  try {
    await sendScoreboard();
  } catch (error) {
    clearInterval(heartbeat);
    unsubscribe();
    console.error("[SSE] Initial scoreboard fetch failed:", error);
    reply.raw.end();
  }
}
