import type { SupabaseClient } from "@supabase/supabase-js";
import type { JwtUserPayload } from "./index.js";

declare module "fastify" {
  interface FastifyInstance {
    supabase: SupabaseClient;
  }
  
  interface FastifyRequest {
    user: JwtUserPayload;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtUserPayload;
    user: JwtUserPayload;
  }
}

export {};