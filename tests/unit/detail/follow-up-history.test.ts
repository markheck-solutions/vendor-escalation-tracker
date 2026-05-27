import { describe, expect, it } from "vitest";

import { getFollowUpHistoryForDelivery } from "@/lib/detail/follow-up-history";

function utcDate(year: number, month1: number, day: number): Date {
  return new Date(Date.UTC(year, month1 - 1, day, 0, 0, 0, 0));
}

describe("getFollowUpHistoryForDelivery", () => {
  it("returns empty history for deliveries without seeded events", () => {
    const history = getFollowUpHistoryForDelivery({
      deliveryId: "deliv_0006",
      lastVendorTouchDate: utcDate(2026, 6, 1),
    });

    expect(history).toEqual([]);
  });

  it("returns newest-first events aligned to the last vendor touch date", () => {
    const lastVendorTouchDate = utcDate(2026, 5, 12);
    const history = getFollowUpHistoryForDelivery({
      deliveryId: "deliv_0002",
      lastVendorTouchDate,
    });

    expect(history.length).toBeGreaterThan(1);

    expect(new Date(history[0]!.occurredAt).getTime()).toBe(lastVendorTouchDate.getTime());

    for (let i = 1; i < history.length; i++) {
      const prev = new Date(history[i - 1]!.occurredAt).getTime();
      const cur = new Date(history[i]!.occurredAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(cur);
    }
  });
});
