import { z } from "zod";

const PublicEnvSchema = z.object({
  // Values prefixed with NEXT_PUBLIC_ are safe to read from client components.
  NEXT_PUBLIC_DEMO_MODE: z
    .enum(["true", "false"])
    .optional()
    .default("true"),
});

export type PublicEnv = z.infer<typeof PublicEnvSchema>;

export function getPublicEnv(env: NodeJS.ProcessEnv = process.env): PublicEnv {
  return PublicEnvSchema.parse(env);
}
