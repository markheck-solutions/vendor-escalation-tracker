import "server-only";

import type { FollowUpEventDto, FollowUpEventKind } from "./types";

type FollowUpEventSeed = {
  occurredAt: Date;
  kind: FollowUpEventKind;
  summary: string;
  source?: string;
};

function utcDate(year: number, month1: number, day: number): Date {
  return new Date(Date.UTC(year, month1 - 1, day, 0, 0, 0, 0));
}

function asIso(value: Date): string {
  return value.toISOString();
}

const FOLLOW_UP_HISTORY: Record<string, FollowUpEventSeed[]> = {
  deliv_0001: [
    {
      occurredAt: utcDate(2026, 5, 5),
      kind: "follow_up_call",
      summary: "Confirmed optics replacement is still pending; no ship date committed.",
      source: "Vendor call",
    },
    {
      occurredAt: utcDate(2026, 4, 28),
      kind: "follow_up_email",
      summary: "Requested ship date, interim reroute option, and escalation contact.",
      source: "Outbound email",
    },
    {
      occurredAt: utcDate(2026, 4, 21),
      kind: "internal_note",
      summary: "Prepared escalation outline if ship date slips beyond the due window.",
      source: "Internal note",
    },
  ],
  deliv_0002: [
    {
      occurredAt: utcDate(2026, 5, 12),
      kind: "follow_up_call",
      summary: "Vendor stated permit is in review; asked for written ETA and alternate entry options.",
      source: "Vendor call",
    },
    {
      occurredAt: utcDate(2026, 5, 8),
      kind: "follow_up_email",
      summary: "Requested permit status update and confirmed who owns the next submission step.",
      source: "Outbound email",
    },
    {
      occurredAt: utcDate(2026, 4, 30),
      kind: "internal_note",
      summary: "Reviewed street-level access constraints and documented backup plan assumptions.",
      source: "Internal note",
    },
  ],
  deliv_0003: [
    {
      occurredAt: utcDate(2026, 5, 22),
      kind: "follow_up_email",
      summary: "Requested crew confirmation and a one-page execution checklist for the window.",
      source: "Outbound email",
    },
    {
      occurredAt: utcDate(2026, 5, 15),
      kind: "follow_up_call",
      summary: "Vendor indicated crew assignment is pending; asked for named owner and decision date.",
      source: "Vendor call",
    },
  ],
  deliv_0004: [
    {
      occurredAt: utcDate(2026, 5, 27),
      kind: "follow_up_call",
      summary: "Confirmed cross-connect details; vendor to provide photo confirmation plan.",
      source: "Vendor call",
    },
  ],
  deliv_0008: [
    {
      occurredAt: utcDate(2026, 5, 20),
      kind: "follow_up_email",
      summary: "Requested a two-day handoff window and onsite signoff contact for hardware handoff.",
      source: "Outbound email",
    },
    {
      occurredAt: utcDate(2026, 5, 13),
      kind: "internal_note",
      summary: "Noted that the handoff window is the pacing item for the delivery schedule.",
      source: "Internal note",
    },
    {
      occurredAt: utcDate(2026, 5, 6),
      kind: "vendor_touch",
      summary: "Vendor acknowledged the request and asked for available dates for the handoff.",
      source: "Vendor touch",
    },
  ],
};

function sortNewestFirst(a: FollowUpEventSeed, b: FollowUpEventSeed): number {
  return b.occurredAt.getTime() - a.occurredAt.getTime();
}

export function getFollowUpHistoryForDelivery(args: {
  deliveryId: string;
  lastVendorTouchDate: Date;
}): FollowUpEventDto[] {
  const seeded = FOLLOW_UP_HISTORY[args.deliveryId];
  if (!seeded?.length) return [];

  const sorted = [...seeded].sort(sortNewestFirst);

  // Safety: keep the most recent event aligned with lastVendorTouchDate so the
  // timeline doesn't contradict the primary delivery metric surface.
  const mostRecent = sorted[0];
  if (mostRecent && mostRecent.occurredAt.getTime() !== args.lastVendorTouchDate.getTime()) {
    sorted[0] = {
      ...mostRecent,
      occurredAt: args.lastVendorTouchDate,
    };
  }

  return sorted.map((e) => ({
    occurredAt: asIso(e.occurredAt),
    kind: e.kind,
    summary: e.summary,
    source: e.source,
  }));
}
