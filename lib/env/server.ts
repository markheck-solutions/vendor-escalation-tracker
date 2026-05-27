import "server-only";

import { z } from "zod";

function assertNoForbiddenPublicEnvKeys(env: Record<string, string | undefined>): void {
  const forbidden = new Set([
    "NEXT_PUBLIC_AI_PROVIDER",
    "NEXT_PUBLIC_DATABASE_URL",
    "NEXT_PUBLIC_OPENAI_COMPATIBLE_BASE_URL",
    "NEXT_PUBLIC_OPENAI_COMPATIBLE_API_KEY",
    "NEXT_PUBLIC_OPENAI_COMPATIBLE_MODEL",
  ]);

  for (const key of Object.keys(env)) {
    if (forbidden.has(key)) {
      throw new Error(`Refusing to load private config from public env key: ${key}`);
    }
  }
}

const ServerEnvSchema = z.object({
  // Values that are safe to expose to the browser, but are also read on the server.
  NEXT_PUBLIC_DEMO_MODE: z.enum(["true", "false"]).optional().default("true"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(""),

  // In public demo mode, keep this set to "mock".
  AI_PROVIDER: z.enum(["mock", "openai-compatible"]).optional().default("mock"),

  // Database and Supabase values are intentionally not validated yet.
  // Future slices will tighten this contract and add safe failure modes.
  DATABASE_URL: z.string().optional(),

  // Optional private local OpenAI-compatible provider (server-only).
  OPENAI_COMPATIBLE_BASE_URL: z.string().optional(),
  OPENAI_COMPATIBLE_API_KEY: z.string().optional(),
  OPENAI_COMPATIBLE_MODEL: z.string().optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function getServerEnv(
  env: Record<string, string | undefined> = process.env,
): ServerEnv {
  assertNoForbiddenPublicEnvKeys(env);
  return ServerEnvSchema.parse(env);
}
