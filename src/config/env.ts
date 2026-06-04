import { config } from "dotenv";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../.env") });

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  CORS_ORIGIN: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  RATE_LIMIT_MAX: z.coerce.number().default(5),
  RATE_LIMIT_TIME_WINDOW_MS: z.coerce.number().default(60_000),
  CHALLENGES_ASSETS_PATH: z.string().default(
    "./src/challenges/foto-kenangan/assets"
  ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Failed to load backend environment configuration.");
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const challengesAssetsPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
  env.CHALLENGES_ASSETS_PATH
);
