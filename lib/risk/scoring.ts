import { diffUtcDays } from "./time";

export type RiskLevel = "normal" | "low" | "medium" | "high";

function formatUsd(value: number): string {
  const rounded = Math.round(value);
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatDays(count: number): string {
  const abs = Math.abs(count);
  return abs === 1 ? "1 day" : `${abs} days`;
}

export function scoreDeliveryRisk(args: {
  revenueExposureUsd: number;
  dueDate: Date;
  lastVendorTouchDate: Date;
  isBlocked: boolean;
  followUpAttempts: number;
  now?: Date;
}): { level: RiskLevel; reasons: string[] } {
  const now = args.now ?? new Date();

  const revenueExposureUsd = Math.max(0, Math.trunc(args.revenueExposureUsd));
  const followUpAttempts = Math.max(0, Math.trunc(args.followUpAttempts));

  const daysUntilDue = diffUtcDays(args.dueDate, now);
  const daysSinceVendorTouch = diffUtcDays(now, args.lastVendorTouchDate);

  const reasons: string[] = [];
  let score = 0;

  // Revenue exposure signal.
  if (revenueExposureUsd >= 250_000) {
    score += 30;
    reasons.push(`Revenue exposure is high ($${formatUsd(revenueExposureUsd)}).`);
  } else if (revenueExposureUsd >= 100_000) {
    score += 22;
    reasons.push(`Revenue exposure is elevated ($${formatUsd(revenueExposureUsd)}).`);
  } else if (revenueExposureUsd >= 50_000) {
    score += 15;
    reasons.push(`Revenue exposure is moderate ($${formatUsd(revenueExposureUsd)}).`);
  } else if (revenueExposureUsd >= 20_000) {
    score += 8;
    reasons.push(`Revenue exposure is non-trivial ($${formatUsd(revenueExposureUsd)}).`);
  }

  // Due date urgency.
  if (daysUntilDue < 0) {
    score += 25;
    reasons.push(`Due date is past due by ${formatDays(daysUntilDue)}.`);
  } else if (daysUntilDue <= 3) {
    score += 22;
    reasons.push(`Due date is in ${formatDays(daysUntilDue)}.`);
  } else if (daysUntilDue <= 7) {
    score += 15;
    reasons.push(`Due date is in ${formatDays(daysUntilDue)}.`);
  } else if (daysUntilDue <= 14) {
    score += 8;
    reasons.push(`Due date is within two weeks (${formatDays(daysUntilDue)}).`);
  }

  // Stale follow-up pressure.
  if (daysSinceVendorTouch >= 14) {
    score += 20;
    reasons.push(`No vendor touch in ${formatDays(daysSinceVendorTouch)}.`);
  } else if (daysSinceVendorTouch >= 7) {
    score += 12;
    reasons.push(`No vendor touch in ${formatDays(daysSinceVendorTouch)}.`);
  } else if (daysSinceVendorTouch >= 3) {
    score += 6;
    reasons.push(`No vendor touch in ${formatDays(daysSinceVendorTouch)}.`);
  }

  // Blocked/escalated status.
  if (args.isBlocked) {
    score += 18;
    reasons.push("Delivery is blocked.");
  }

  // Follow-up attempt fatigue.
  if (followUpAttempts >= 3) {
    score += 10;
    reasons.push(`${followUpAttempts} follow-up attempts already made.`);
  } else if (followUpAttempts >= 1) {
    score += 4;
    reasons.push(`${followUpAttempts} follow-up attempt already made.`);
  }

  let level: RiskLevel = "normal";
  if (score >= 70) level = "high";
  else if (score >= 45) level = "medium";
  else if (score >= 20) level = "low";

  // Keep reasons ordered and stable for deterministic UI rendering.
  return { level, reasons };
}
