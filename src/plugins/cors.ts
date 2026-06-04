import fp from "fastify-plugin";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import { corsOrigins } from "../config/env.js";

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
});
