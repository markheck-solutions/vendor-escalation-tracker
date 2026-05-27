import { describe, expect, it } from "vitest";

import { isStaleFollowUp } from "@/lib/risk/stale-follow-up";

function utcDate(year: number, month1: number, day: number): Date {
  return new Date(Date.UTC(year, month1 - 1, day, 0, 0, 0, 0));
}

describe("isStaleFollowUp", () => {
  it("flags stale follow-ups at the default threshold (7+ days)", () => {
    const now = utcDate(2026, 6, 1);

    expect(isStaleFollowUp({ lastVendorTouchDate: utcDate(2026, 5, 26), now })).toBe(false); // 6 days
    expect(isStaleFollowUp({ lastVendorTouchDate: utcDate(2026, 5, 25), now })).toBe(true); // 7 days
  });

  it("supports an explicit stale threshold override", () => {
    const now = utcDate(2026, 6, 1);

    expect(
      isStaleFollowUp({ lastVendorTouchDate: utcDate(2026, 5, 30), now, staleAfterDays: 3 }),
    ).toBe(false); // 2 days

    expect(
      isStaleFollowUp({ lastVendorTouchDate: utcDate(2026, 5, 29), now, staleAfterDays: 3 }),
    ).toBe(true); // 3 days
  });
});
