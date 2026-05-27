import "server-only";

import type { DraftProvider, DraftResult, DraftType, DraftTone } from "./draft-provider";

function tonePrefix(tone: DraftTone): string {
  switch (tone) {
    case "collaborative":
      return "Hi team";
    case "direct":
      return "Hello";
    case "urgent":
      return "Hi";
  }
}

function subjectLine(type: DraftType): string {
  switch (type) {
    case "status-request":
      return "Quick status check";
    case "escalation":
      return "Escalation needed";
    case "executive-update":
      return "Executive update requested";
  }
}

export const mockDraftProvider: DraftProvider = {
  async generateDraft({ context, options }): Promise<DraftResult> {
    const intro = tonePrefix(options.tone);
    const subject = subjectLine(options.type);

    // Deterministic output: do not use random values in public mock mode.
    const lines: string[] = [
      `Subject: ${subject} - ${context.serviceAlias}`,
      "",
      `${intro},`,
      "",
      `Following up on ${context.serviceAlias} for ${context.customerAlias}.`,
      `Current blocker: ${context.blocker}.`,
      `Vendor: ${context.vendorAlias}.`,
      "",
      `Next action: ${context.nextAction}.`,
      "",
      "Please share an updated ETA and the next concrete step on your side.",
      "",
      "Thanks,",
      "Service Delivery",
    ];

    return { draftText: lines.join("\n") };
  },
};
