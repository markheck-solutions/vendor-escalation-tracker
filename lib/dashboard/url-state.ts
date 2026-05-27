import {
  DEFAULT_DELIVERY_FILTERS,
  type DeliveryFilters,
  type DeliverySortKey,
} from "@/lib/dashboard/queue";

export type DashboardUrlState = {
  sortKey: DeliverySortKey;
  filters: DeliveryFilters;
  detailDeliveryId: string | null;
};

const SORT_KEYS: readonly DeliverySortKey[] = [
  "priority",
  "due_date",
  "revenue",
  "last_touch",
];

function isSortKey(value: string): value is DeliverySortKey {
  return (SORT_KEYS as readonly string[]).includes(value);
}

function isDeliveryId(value: string): boolean {
  return /^deliv_\d{4}$/.test(value);
}

function normalizeOptionalToken(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalFacet(value: string | null): string | "all" | null {
  const token = normalizeOptionalToken(value);
  if (!token) return null;
  if (token === "all") return "all";
  return token;
}

export function parseDashboardUrlState(params: { get(key: string): string | null }): DashboardUrlState {
  const sortToken = normalizeOptionalToken(params.get("sort"));
  const sortKey: DeliverySortKey = sortToken && isSortKey(sortToken) ? sortToken : "priority";

  const risk = normalizeOptionalFacet(params.get("risk"));
  const status = normalizeOptionalFacet(params.get("status"));
  const market = normalizeOptionalFacet(params.get("market"));
  const blocker = normalizeOptionalFacet(params.get("blocker"));
  const stale = normalizeOptionalFacet(params.get("stale"));

  const filters: DeliveryFilters = {
    ...DEFAULT_DELIVERY_FILTERS,
    riskLevel:
      risk === "high" || risk === "medium" || risk === "low" || risk === "normal" || risk === "all"
        ? risk
        : "all",
    status:
      status === "on-track" ||
      status === "at-risk" ||
      status === "blocked" ||
      status === "escalated" ||
      status === "all"
        ? status
        : "all",
    market: market === null ? "all" : market,
    blocker: blocker === null ? "all" : blocker,
    staleFollowUp: stale === "stale" || stale === "fresh" || stale === "all" ? stale : "all",
  };

  const detailToken = normalizeOptionalToken(params.get("detail"));
  const detailDeliveryId = detailToken && isDeliveryId(detailToken) ? detailToken : null;

  return { sortKey, filters, detailDeliveryId };
}

function setIfNonDefault(params: URLSearchParams, key: string, value: string, defaultValue: string) {
  if (value === defaultValue) params.delete(key);
  else params.set(key, value);
}

export function buildDashboardUrlSearchParams(state: DashboardUrlState): URLSearchParams {
  const params = new URLSearchParams();

  setIfNonDefault(params, "sort", state.sortKey, "priority");
  setIfNonDefault(params, "risk", state.filters.riskLevel, "all");
  setIfNonDefault(params, "status", state.filters.status, "all");
  setIfNonDefault(params, "market", state.filters.market, "all");
  setIfNonDefault(params, "blocker", state.filters.blocker, "all");
  setIfNonDefault(params, "stale", state.filters.staleFollowUp, "all");

  if (state.detailDeliveryId) params.set("detail", state.detailDeliveryId);
  else params.delete("detail");

  return params;
}
