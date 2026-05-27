import { z } from "zod";

const PublicEnvSchema = z.object({
  // Values prefixed with NEXT_PUBLIC_ are safe to read from client components.
  NEXT_PUBLIC_DEMO_MODE: z
    .enum(["true", "false"])
    .optional()
    .default("true"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(""),
});

export type PublicEnv = z.infer<typeof PublicEnvSchema>;

export function getPublicEnv(
  env: Record<string, string | undefined> = process.env,
): PublicEnv {
  return PublicEnvSchema.parse(env);
}
