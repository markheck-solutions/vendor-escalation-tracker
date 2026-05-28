import "server-only";

import type { DraftProvider, DraftResult, DraftType, DraftTone } from "./draft-provider";

function greeting(tone: DraftTone): string {
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

function sendPrefix(tone: DraftTone): string {
  switch (tone) {
    case "collaborative":
      return "Could you please send:";
    case "direct":
      return "Please provide:";
    case "urgent":
      return "Urgent: please send:";
  }
}

function confirmPrefix(tone: DraftTone): string {
  switch (tone) {
    case "collaborative":
      return "Could you please confirm:";
    case "direct":
      return "Please confirm:";
    case "urgent":
      return "Urgent: please confirm:";
  }
}

function urgencyFooter(tone: DraftTone): string[] {
  if (tone !== "urgent") return [];
  return [
    "",
    "This is time-sensitive and needs a same-day response so we can keep the delivery plan credible.",
  ];
}

function buildTypeSection(args: {
  type: DraftType;
  tone: DraftTone;
  context: { serviceAlias: string; customerAlias: string; vendorAlias: string; blocker: string; nextAction: string };
}): string[] {
  const { type, tone, context } = args;
  const send = sendPrefix(tone);
  const confirm = confirmPrefix(tone);

  switch (type) {
    case "status-request": {
      return [
        send,
        "- current status on the vendor side",
        "- updated ETA for the next milestone or ship date",
        "- next concrete step and owner on your side",
        "- any dependencies you need from us",
        "",
        `Vendor: ${context.vendorAlias}`,
        `Our current view: ${context.blocker}`,
        `Planned next action on our side: ${context.nextAction}`,
      ];
    }

    case "escalation": {
      return [
        "Action needed escalation:",
        "",
        `We need ownership and timing on this issue to prevent rework and protect the delivery plan.`,
        confirm,
        "- named owner and backup contact on your side",
        "- recovery plan plus updated ETA",
        "- next update time today even if the ETA is unchanged",
        "",
        `Vendor: ${context.vendorAlias}`,
        `Current blocker: ${context.blocker}`,
        `Next action we are taking: ${context.nextAction}`,
        "",
        "If we do not have ownership + plan today, we will treat this as an escalation and pull in leadership.",
      ];
    }

    case "executive-update": {
      return [
        "Executive update summary:",
        "",
        `Service: ${context.serviceAlias}`,
        `Customer/Vendor: ${context.customerAlias} / ${context.vendorAlias}`,
        `Current blocker: ${context.blocker}`,
        "",
        "Risk/impact:",
        "- Delivery plan remains at risk until the vendor provides a committed recovery timeline.",
        "- Continued uncertainty increases the chance of missed dates and additional escalations.",
        "",
        "Next action:",
        `- ${context.nextAction}`,
        "",
        "Ask:",
        `- ${confirm.replace(":", "")} ownership + updated ETA, and commit to a daily check-in until stable.`,
      ];
    }
  }
}

export const mockDraftProvider: DraftProvider = {
  async generateDraft({ context, options }): Promise<DraftResult> {
    const intro = greeting(options.tone);
    const subject = subjectLine(options.type);

    // Deterministic output: do not use random values in public mock mode.
    const lines: string[] = [
      `Subject: ${subject} - ${context.serviceAlias}`,
      "",
      `${intro},`,
      "",
      `Following up on ${context.serviceAlias} for ${context.customerAlias}.`,
      "",
      ...buildTypeSection({ type: options.type, tone: options.tone, context }),
      ...urgencyFooter(options.tone),
      "",
      options.tone === "collaborative" ? "Appreciate the partnership here." : "Thanks,",
      "Service Delivery",
    ];

    return { draftText: lines.join("\n") };
  },
};
