import { describe, expect, it } from "vitest";

import { scoreDeliveryRisk } from "@/lib/risk/scoring";

function utcDate(year: number, month1: number, day: number): Date {
  return new Date(Date.UTC(year, month1 - 1, day, 0, 0, 0, 0));
}

describe("scoreDeliveryRisk", () => {
  it("is deterministic for the same inputs", () => {
    const now = utcDate(2026, 6, 1);

    const args = {
      revenueExposureUsd: 300_000,
      dueDate: utcDate(2026, 6, 3),
      lastVendorTouchDate: utcDate(2026, 5, 22),
      isBlocked: true,
      followUpAttempts: 3,
      now,
    };

    const a = scoreDeliveryRisk(args);
    const b = scoreDeliveryRisk(args);
    expect(a).toEqual(b);
  });

  it("classifies clearly high-risk deliveries with explainable reasons", () => {
    const now = utcDate(2026, 6, 1);

    const result = scoreDeliveryRisk({
      revenueExposureUsd: 300_000,
      dueDate: utcDate(2026, 6, 3),
      lastVendorTouchDate: utcDate(2026, 5, 22),
      isBlocked: true,
      followUpAttempts: 3,
      now,
    });

    expect(result.level).toBe("high");
    expect(result.reasons.join("\n")).not.toMatch(/scaffold/i);
    expect(result.reasons.some((r) => /Revenue exposure/i.test(r))).toBe(true);
    expect(result.reasons.some((r) => /Due date/i.test(r))).toBe(true);
    expect(result.reasons.some((r) => /vendor touch/i.test(r))).toBe(true);
    expect(result.reasons.some((r) => /blocked/i.test(r))).toBe(true);
    expect(result.reasons.some((r) => /follow-up attempts/i.test(r))).toBe(true);
  });

  it("treats low-exposure, far-due, recently-touched deliveries as normal", () => {
    const now = utcDate(2026, 6, 1);

    const result = scoreDeliveryRisk({
      revenueExposureUsd: 9_500,
      dueDate: utcDate(2026, 7, 15),
      lastVendorTouchDate: utcDate(2026, 5, 31),
      isBlocked: false,
      followUpAttempts: 0,
      now,
    });

    expect(result.level).toBe("normal");
    expect(result.reasons).toHaveLength(0);
  });
});
