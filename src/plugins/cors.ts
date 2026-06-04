import fp from "fastify-plugin";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";

export default fp(async (fastify: FastifyInstance) => {
  const staticOrigins = env.CORS_ORIGIN.split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);

      // Cek static origins dari env
      if (staticOrigins.includes(origin)) return callback(null, true);

      // Izinkan semua preview URL Vercel milik project ini
      if (/^https:\/\/nusa-[a-z0-9-]+\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
});