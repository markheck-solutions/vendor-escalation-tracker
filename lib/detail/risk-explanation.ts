import "server-only";

import { diffUtcDays } from "@/lib/risk/time";
import { scoreDeliveryRisk } from "@/lib/risk/scoring";

import type { DeliveryDto } from "@/lib/dashboard/metrics";
import type { FollowUpEventDto, RiskExplanationDto } from "./types";

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatDays(count: number): string {
  const abs = Math.abs(count);
  const label = abs === 1 ? "1 day" : `${abs} days`;
  return count < 0 ? `${label} ago` : `in ${label}`;
}

function followUpAttempts(history: FollowUpEventDto[]): number {
  return history.reduce((sum, e) => {
    if (e.kind === "follow_up_email" || e.kind === "follow_up_call") return sum + 1;
    return sum;
  }, 0);
}

function headlineForRisk(riskLevel: DeliveryDto["riskLevel"]): string {
  switch (riskLevel) {
    case "high":
      return "Why this is high risk";
    case "medium":
      return "Why this is medium risk";
    case "low":
      return "Why this is low risk";
    default:
      return "Why this is normal risk";
  }
}

export function buildRiskExplanation(args: {
  riskLevel: DeliveryDto["riskLevel"];
  status: DeliveryDto["status"];
  revenueExposureUsd: number;
  dueDate: Date;
  lastVendorTouchDate: Date;
  history: FollowUpEventDto[];
  now?: Date;
}): RiskExplanationDto {
  const now = args.now ?? new Date();
  const daysUntilDue = diffUtcDays(args.dueDate, now);
  const daysSinceTouch = diffUtcDays(now, args.lastVendorTouchDate);

  const attempts = followUpAttempts(args.history);
  const scored = scoreDeliveryRisk({
    revenueExposureUsd: args.revenueExposureUsd,
    dueDate: args.dueDate,
    lastVendorTouchDate: args.lastVendorTouchDate,
    isBlocked: args.status === "blocked" || args.status === "escalated",
    followUpAttempts: attempts,
    now,
  });

  const reasons: string[] = [];

  // Prefer deterministic scoring reasons when available, but always provide at least
  // one concrete explanation so "normal" and "low" risk records aren't blank.
  reasons.push(...scored.reasons);

  if (reasons.length === 0) {
    const exposure = formatUsd(Math.max(0, Math.trunc(args.revenueExposureUsd)));

    if (daysSinceTouch < 0) {
      reasons.push(`Vendor touch is scheduled ${formatDays(daysSinceTouch)}.`);
    } else if (daysSinceTouch === 0) {
      reasons.push("Vendor touch happened today.");
    } else {
      reasons.push(`Most recent vendor touch was ${formatDays(daysSinceTouch)}.`);
    }

    if (daysUntilDue < 0) {
      reasons.push(`Due date is past due by ${formatDays(daysUntilDue)}.`);
    } else if (daysUntilDue === 0) {
      reasons.push("Due date is today.");
    } else {
      reasons.push(`Due date is ${formatDays(daysUntilDue)}.`);
    }

    reasons.push(`Revenue exposure is ${exposure}.`);
  }

  // Ensure the explanation stays tied to the visible risk label even if the demo seed
  // tags an item slightly differently than the scoring heuristic.
  if (args.riskLevel === "high") {
    reasons.unshift("Treat this as a priority vendor follow-up with escalation-ready posture.");
  } else if (args.riskLevel === "medium") {
    reasons.unshift("This needs active follow-up to avoid slipping the due window.");
  } else if (args.riskLevel === "low") {
    reasons.unshift("Track this on the weekly cadence, but keep the blocker from going stale.");
  } else {
    reasons.unshift("No major risk drivers detected, keep a light-touch cadence.");
  }

  return {
    headline: headlineForRisk(args.riskLevel),
    reasons,
  };
}
