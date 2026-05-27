import type {
  DeliveryDto,
  DeliveryRiskLevel,
  DeliveryStatus,
} from "@/lib/dashboard/metrics";

export type DeliverySortKey = "priority" | "due_date" | "revenue" | "last_touch";

export type DeliveryStaleFilter = "all" | "stale" | "fresh";

export type DeliveryFilters = {
  riskLevel: DeliveryRiskLevel | "all";
  status: DeliveryStatus | "all";
  market: string | "all";
  blocker: string | "all";
  staleFollowUp: DeliveryStaleFilter;
};

export const DEFAULT_DELIVERY_FILTERS: DeliveryFilters = {
  riskLevel: "all",
  status: "all",
  market: "all",
  blocker: "all",
  staleFollowUp: "all",
};

const RISK_ORDER: Record<DeliveryRiskLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
  normal: 3,
};

function asTime(value: string): number {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function compareTime(earlierIso: string, laterIso: string): number {
  const a = asTime(earlierIso);
  const b = asTime(laterIso);
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function applyDeliveryFilters(deliveries: DeliveryDto[], filters: DeliveryFilters) {
  return deliveries.filter((d) => {
    if (filters.riskLevel !== "all" && d.riskLevel !== filters.riskLevel) return false;
    if (filters.status !== "all" && d.status !== filters.status) return false;
    if (filters.market !== "all" && d.market !== filters.market) return false;
    if (filters.blocker !== "all" && d.blocker !== filters.blocker) return false;

    if (filters.staleFollowUp === "stale" && !d.staleFollowUp) return false;
    if (filters.staleFollowUp === "fresh" && d.staleFollowUp) return false;

    return true;
  });
}

export function sortDeliveries(deliveries: DeliveryDto[], sortKey: DeliverySortKey) {
  const indexed = deliveries.map((d, idx) => ({ d, idx }));

  indexed.sort((a, b) => {
    const x = a.d;
    const y = b.d;

    const riskDiff = RISK_ORDER[x.riskLevel] - RISK_ORDER[y.riskLevel];
    const exposureDiff = y.revenueExposureUsd - x.revenueExposureUsd;
    const dueDiff = compareTime(x.dueDate, y.dueDate);
    const touchDiff = compareTime(x.lastVendorTouchDate, y.lastVendorTouchDate);

    switch (sortKey) {
      case "due_date": {
        const v =
          dueDiff ||
          riskDiff ||
          exposureDiff ||
          x.id.localeCompare(y.id);
        if (v !== 0) return v;
        return a.idx - b.idx;
      }
      case "revenue": {
        const v =
          exposureDiff ||
          riskDiff ||
          dueDiff ||
          x.id.localeCompare(y.id);
        if (v !== 0) return v;
        return a.idx - b.idx;
      }
      case "last_touch": {
        const v =
          touchDiff ||
          riskDiff ||
          exposureDiff ||
          dueDiff ||
          x.id.localeCompare(y.id);
        if (v !== 0) return v;
        return a.idx - b.idx;
      }
      default: {
        const v =
          riskDiff ||
          exposureDiff ||
          dueDiff ||
          touchDiff ||
          x.id.localeCompare(y.id);
        if (v !== 0) return v;
        return a.idx - b.idx;
      }
    }
  });

  return indexed.map((x) => x.d);
}
