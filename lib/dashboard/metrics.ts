import { diffUtcDays } from "@/lib/risk/time";

export type DeliveryRiskLevel = "normal" | "low" | "medium" | "high";
export type DeliveryStatus = "on-track" | "at-risk" | "blocked" | "escalated";

export type DeliveryDto = {
  id: string;
  customerAlias: string;
  vendorAlias: string;
  serviceAlias: string;
  market: string;
  status: DeliveryStatus;
  riskLevel: DeliveryRiskLevel;
  revenueExposureUsd: number;
  dueDate: string; // ISO date string from JSON
  lastVendorTouchDate: string; // ISO date string from JSON
  staleFollowUp: boolean;
  blocker: string;
  ownerAlias: string;
  nextAction: string;
};

export type DashboardMetrics = {
  /** Sum of revenue exposure for at-risk work (medium + high risk). */
  revenueExposureUsd: number;
  /** Count of deliveries flagged as stale follow-up. */
  staleFollowUps: number;
  /** Count of deliveries that are medium + high risk. */
  atRiskDeliveries: number;
  /** Count of deliveries that should be treated as immediate next actions. */
  nextActions: number;
  /** Total delivery count considered by these metrics. */
  totalDeliveries: number;
};

const RISKY_LEVELS = new Set<DeliveryRiskLevel>(["high", "medium"]);
const ACTIONABLE_LEVELS = new Set<DeliveryRiskLevel>(["high", "medium"]);

export function deriveDashboardMetrics(args: {
  deliveries: DeliveryDto[];
  now?: Date;
}): DashboardMetrics {
  const now = args.now ?? new Date();

  const risky = args.deliveries.filter((d) => RISKY_LEVELS.has(d.riskLevel));
  const revenueExposureUsd = risky.reduce(
    (sum, d) => sum + Math.max(0, Math.trunc(d.revenueExposureUsd)),
    0,
  );

  const staleFollowUps = args.deliveries.reduce((sum, d) => sum + (d.staleFollowUp ? 1 : 0), 0);

  const atRiskDeliveries = risky.length;

  const nextActions = args.deliveries.reduce((sum, d) => {
    const dueDate = new Date(d.dueDate);
    const daysUntilDue = Number.isNaN(dueDate.getTime())
      ? Number.POSITIVE_INFINITY
      : diffUtcDays(dueDate, now);

    const isAction =
      d.staleFollowUp ||
      d.status === "blocked" ||
      d.status === "escalated" ||
      ACTIONABLE_LEVELS.has(d.riskLevel) ||
      daysUntilDue <= 10;

    return sum + (isAction ? 1 : 0);
  }, 0);

  return {
    revenueExposureUsd,
    staleFollowUps,
    atRiskDeliveries,
    nextActions,
    totalDeliveries: args.deliveries.length,
  };
}
