import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(jwt, {
    secret: env.SUPABASE_JWT_SECRET,
  });
});
