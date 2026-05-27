import "server-only";

import { z } from "zod";

const ServerEnvSchema = z.object({
  // In public demo mode, keep this set to "mock".
  AI_PROVIDER: z.enum(["mock", "openai-compatible"]).optional().default("mock"),

  // Database and Supabase values are intentionally not validated yet.
  // Future slices will tighten this contract and add safe failure modes.
  DATABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),

  // Optional private local OpenAI-compatible provider (server-only).
  OPENAI_COMPATIBLE_BASE_URL: z.string().optional(),
  OPENAI_COMPATIBLE_API_KEY: z.string().optional(),
  OPENAI_COMPATIBLE_MODEL: z.string().optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function getServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  return ServerEnvSchema.parse(env);
}
