import fp from "fastify-plugin";
import { createClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";

export default fp(async (fastify: FastifyInstance) => {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  fastify.decorate("supabase", supabase);
});
