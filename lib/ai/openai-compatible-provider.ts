import "server-only";

import type { DraftProvider, DraftResult } from "./draft-provider";
import { getServerEnv } from "@/lib/env/server";

export class OpenAICompatibleConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAICompatibleConfigError";
  }
}

export class OpenAICompatibleUpstreamError extends Error {
  readonly status: number;

  constructor(args: { status: number; message: string }) {
    super(args.message);
    this.name = "OpenAICompatibleUpstreamError";
    this.status = args.status;
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

  let apiBase: URL;
  try {
    apiBase = new URL(baseUrl);
  } catch {
    throw new OpenAICompatibleConfigError(
      "OpenAI-compatible provider is not configured (OPENAI_COMPATIBLE_BASE_URL is not a valid URL).",
    );
  }

  return { apiBase, apiKey, model };
}

export const openaiCompatibleDraftProvider: DraftProvider = {
  async generateDraft({ context, options }): Promise<DraftResult> {
    const { apiBase, apiKey, model } = getConfig();

    const endpoint = new URL("/v1/chat/completions", apiBase);

    const userPromptLines: string[] = [
      "Write a vendor follow-up draft for circuit delivery work.",
      "",
      `Draft type: ${options.type}`,
      `Tone: ${options.tone}`,
      "",
      "Delivery context:",
      `- Delivery ID: ${context.deliveryId}`,
      `- Customer: ${context.customerAlias}`,
      `- Vendor: ${context.vendorAlias}`,
      `- Service: ${context.serviceAlias}`,
      `- Current blocker: ${context.blocker}`,
      `- Next action: ${context.nextAction}`,
      "",
      "Requirements:",
      "- Output plain text only.",
      "- Include a Subject line.",
      "- Do not include any secrets, tokens, or private endpoints.",
    ];

    const outboundBody = {
      model,
      messages: [
        {
          role: "system",
          content: "You draft concise service delivery follow-up notes.",
        },
        {
          role: "user",
          content: userPromptLines.join("\n"),
        },
      ],
    } as const;

    let res: Response;
    try {
      res = await fetch(endpoint.toString(), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(outboundBody),
      });
    } catch {
      throw new OpenAICompatibleUpstreamError({
        status: 502,
        message: "Draft provider request failed.",
      });
    }

    if (!res.ok) {
      throw new OpenAICompatibleUpstreamError({
        status: res.status,
        message: "Draft provider returned a non-success response.",
      });
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new OpenAICompatibleUpstreamError({
        status: 502,
        message: "Draft provider returned invalid JSON.",
      });
    }

    const draftText = extractAssistantText(data);
    if (!draftText) {
      throw new OpenAICompatibleUpstreamError({
        status: 502,
        message: "Draft provider returned an unexpected response shape.",
      });
    }

    return { draftText };
  },
};

function extractAssistantText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;

  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length < 1) return null;

  const first = choices[0] as { message?: unknown } | undefined;
  const msg = first?.message as { content?: unknown } | undefined;
  const content = msg?.content;
  if (typeof content !== "string") return null;

  const trimmed = content.trim();
  return trimmed ? trimmed : null;
}
