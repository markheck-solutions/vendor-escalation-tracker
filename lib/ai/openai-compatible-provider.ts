import "server-only";

import type { DraftProvider, DraftResult } from "./draft-provider";
import { getServerEnv } from "@/lib/env/server";

export class OpenAICompatibleConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAICompatibleConfigError";
  }
}

function getConfig() {
  const env = getServerEnv();

  const baseUrl = env.OPENAI_COMPATIBLE_BASE_URL?.trim();
  const apiKey = env.OPENAI_COMPATIBLE_API_KEY?.trim();
  const model = env.OPENAI_COMPATIBLE_MODEL?.trim();

  if (!baseUrl || !apiKey || !model) {
    throw new OpenAICompatibleConfigError(
      "OpenAI-compatible provider is not configured (missing OPENAI_COMPATIBLE_* env vars).",
    );
  }

  return { baseUrl, apiKey, model };
}

export const openaiCompatibleDraftProvider: DraftProvider = {
  async generateDraft(): Promise<DraftResult> {
    // This module is intentionally scaffold-only. A future slice will implement:
    // - request shape mapping
    // - controlled error handling (no secret leakage)
    // - minimal outbound payload
    // - safe local stub validation
    void getConfig();

    throw new Error("OpenAI-compatible draft provider is not implemented yet.");
  },
};
