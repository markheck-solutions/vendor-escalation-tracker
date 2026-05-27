import { describe, expect, it } from "vitest";

import {
  buildDashboardUrlSearchParams,
  parseDashboardUrlState,
} from "@/lib/dashboard/url-state";
import { DEFAULT_DELIVERY_FILTERS } from "@/lib/dashboard/queue";

describe("dashboard url-state", () => {
  it("parses defaults when params are empty or invalid", () => {
    const empty = new URLSearchParams();
    expect(parseDashboardUrlState(empty)).toEqual({
      sortKey: "priority",
      filters: DEFAULT_DELIVERY_FILTERS,
      detailDeliveryId: null,
    });

    const invalid = new URLSearchParams({
      sort: "wat",
      risk: "nope",
      status: "bad",
      stale: "maybe",
      detail: "delivery-123",
      market: "",
      blocker: "   ",
    });

    expect(parseDashboardUrlState(invalid)).toEqual({
      sortKey: "priority",
      filters: DEFAULT_DELIVERY_FILTERS,
      detailDeliveryId: null,
    });
  });

  it("parses valid non-default filters and detail IDs", () => {
    const params = new URLSearchParams({
      sort: "revenue",
      risk: "high",
      status: "blocked",
      market: "North",
      blocker: "Waiting on vendor schedule.",
      stale: "stale",
      detail: "deliv_0007",
    });

    expect(parseDashboardUrlState(params)).toEqual({
      sortKey: "revenue",
      filters: {
        ...DEFAULT_DELIVERY_FILTERS,
        riskLevel: "high",
        status: "blocked",
        market: "North",
        blocker: "Waiting on vendor schedule.",
        staleFollowUp: "stale",
      },
      detailDeliveryId: "deliv_0007",
    });
  });

  it("builds params while omitting defaults", () => {
    const defaults = buildDashboardUrlSearchParams({
      sortKey: "priority",
      filters: DEFAULT_DELIVERY_FILTERS,
      detailDeliveryId: null,
    });
    expect(defaults.toString()).toBe("");

    const nonDefault = buildDashboardUrlSearchParams({
      sortKey: "last_touch",
      filters: {
        ...DEFAULT_DELIVERY_FILTERS,
        riskLevel: "medium",
        market: "West",
      },
      detailDeliveryId: "deliv_0012",
    });

    expect(nonDefault.get("sort")).toBe("last_touch");
    expect(nonDefault.get("risk")).toBe("medium");
    expect(nonDefault.get("market")).toBe("West");
    expect(nonDefault.get("detail")).toBe("deliv_0012");

    // Defaults should not be serialized.
    expect(nonDefault.get("status")).toBeNull();
    expect(nonDefault.get("blocker")).toBeNull();
    expect(nonDefault.get("stale")).toBeNull();
  });

  it("round-trips parse(build(state)) for a representative non-default state", () => {
    const state = {
      sortKey: "due_date" as const,
      filters: {
        ...DEFAULT_DELIVERY_FILTERS,
        riskLevel: "low" as const,
        status: "at-risk" as const,
        staleFollowUp: "fresh" as const,
        market: "South",
      },
      detailDeliveryId: "deliv_0003",
    };

    const params = buildDashboardUrlSearchParams(state);
    expect(parseDashboardUrlState(params)).toEqual(state);
  });
});
