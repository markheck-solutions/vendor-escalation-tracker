import { describe, expect, it } from "vitest";

import type { DeliveryDto } from "@/lib/dashboard/metrics";
import {
  DEFAULT_DELIVERY_FILTERS,
  applyDeliveryFilters,
  sortDeliveries,
} from "@/lib/dashboard/queue";

function d(partial: Partial<DeliveryDto> & Pick<DeliveryDto, "id">): DeliveryDto {
  return {
    id: partial.id,
    customerAlias: partial.customerAlias ?? "Customer A",
    vendorAlias: partial.vendorAlias ?? "Vendor A",
    serviceAlias: partial.serviceAlias ?? "Circuit A",
    market: partial.market ?? "North",
    status: partial.status ?? "on-track",
    riskLevel: partial.riskLevel ?? "normal",
    revenueExposureUsd: partial.revenueExposureUsd ?? 10_000,
    dueDate: partial.dueDate ?? "2026-06-01T00:00:00.000Z",
    lastVendorTouchDate: partial.lastVendorTouchDate ?? "2026-05-01T00:00:00.000Z",
    staleFollowUp: partial.staleFollowUp ?? false,
    blocker: partial.blocker ?? "Waiting on vendor install schedule.",
    ownerAlias: partial.ownerAlias ?? "A. Rivera",
    nextAction: partial.nextAction ?? "Confirm the next vendor slot.",
  };
}

describe("dashboard queue controls", () => {
  it("filters by combined criteria and can recover by clearing", () => {
    const deliveries = [
      d({ id: "a", riskLevel: "high", status: "blocked", market: "North", staleFollowUp: true }),
      d({ id: "b", riskLevel: "medium", status: "at-risk", market: "South", staleFollowUp: true }),
      d({ id: "c", riskLevel: "low", status: "on-track", market: "North", staleFollowUp: false }),
    ];

    const filtered = applyDeliveryFilters(deliveries, {
      ...DEFAULT_DELIVERY_FILTERS,
      riskLevel: "high",
      status: "blocked",
      market: "North",
      staleFollowUp: "stale",
    });

    expect(filtered.map((x) => x.id)).toEqual(["a"]);

    const recovered = applyDeliveryFilters(deliveries, DEFAULT_DELIVERY_FILTERS);
    expect(recovered.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("sorting by revenue orders high exposure first (ties deterministic)", () => {
    const deliveries = [
      d({ id: "a", riskLevel: "high", revenueExposureUsd: 50_000 }),
      d({ id: "b", riskLevel: "normal", revenueExposureUsd: 250_000 }),
      d({ id: "c", riskLevel: "medium", revenueExposureUsd: 250_000 }),
    ];

    const sorted = sortDeliveries(deliveries, "revenue");
    expect(sorted.map((x) => x.id)).toEqual(["c", "b", "a"]);
  });

  it("combined filter + sort preserves the matching record set", () => {
    const deliveries = [
      d({ id: "a", market: "North", revenueExposureUsd: 100_000 }),
      d({ id: "b", market: "South", revenueExposureUsd: 200_000 }),
      d({ id: "c", market: "North", revenueExposureUsd: 300_000 }),
    ];

    const filtered = applyDeliveryFilters(deliveries, {
      ...DEFAULT_DELIVERY_FILTERS,
      market: "North",
    });
    const sorted = sortDeliveries(filtered, "revenue");

    expect(sorted.map((x) => x.id)).toEqual(["c", "a"]);
  });
});
