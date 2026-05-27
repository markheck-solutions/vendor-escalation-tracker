import { describe, expect, it } from "vitest";

import { getPublicEnv } from "@/lib/env/public";
import { getServerEnv } from "@/lib/env/server";

describe("env parsing", () => {
  it("parses public env without leaking server-only values", () => {
    const publicEnv = getPublicEnv({
      NEXT_PUBLIC_DEMO_MODE: "false",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon_key_placeholder",
      // Server-only values that must not be returned by the public parser.
      OPENAI_COMPATIBLE_API_KEY: "sk-secret-placeholder",
      DATABASE_URL: "postgres://user:pass@localhost:5432/db",
    });

    expect(publicEnv).toEqual({
      NEXT_PUBLIC_DEMO_MODE: "false",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon_key_placeholder",
    });
  });

  it("parses server env and defaults safely", () => {
    const serverEnv = getServerEnv({
      NEXT_PUBLIC_DEMO_MODE: "true",
    });

    expect(serverEnv.AI_PROVIDER).toBe("mock");
    expect(serverEnv.NEXT_PUBLIC_DEMO_MODE).toBe("true");
  });

  it("rejects accidental public exposure of private provider config", () => {
    expect(() =>
      getServerEnv({
        AI_PROVIDER: "mock",
        NEXT_PUBLIC_OPENAI_COMPATIBLE_API_KEY: "sk-should-never-be-public",
      }),
    ).toThrow();
  });
});
