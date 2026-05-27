import { describe, expect, it } from "vitest";

import { buildRiskExplanation } from "@/lib/detail/risk-explanation";

function utcDate(year: number, month1: number, day: number): Date {
  return new Date(Date.UTC(year, month1 - 1, day, 0, 0, 0, 0));
}

describe("buildRiskExplanation", () => {
  it("always returns a headline and at least one concrete reason", () => {
    const explanation = buildRiskExplanation({
      riskLevel: "low",
      status: "on-track",
      revenueExposureUsd: 12_000,
      dueDate: utcDate(2026, 7, 15),
      lastVendorTouchDate: utcDate(2026, 6, 2),
      history: [],
      now: utcDate(2026, 6, 3),
    });

    expect(explanation.headline).toMatch(/low risk/i);
    expect(explanation.reasons.length).toBeGreaterThan(0);
    expect(explanation.reasons.join("\n")).toMatch(/Revenue exposure|vendor touch|Due date/i);
  });

  it("includes urgency guidance for high-risk records", () => {
    const explanation = buildRiskExplanation({
      riskLevel: "high",
      status: "blocked",
      revenueExposureUsd: 300_000,
      dueDate: utcDate(2026, 6, 6),
      lastVendorTouchDate: utcDate(2026, 5, 12),
      history: [
        {
          occurredAt: utcDate(2026, 5, 12).toISOString(),
          kind: "follow_up_call",
          summary: "Followed up on permit ETA.",
          source: "Vendor call",
        },
      ],
      now: utcDate(2026, 6, 1),
    });

    expect(explanation.headline).toMatch(/high risk/i);
    expect(explanation.reasons[0]).toMatch(/priority/i);
  });

  it("uses non-contradictory wording for scheduled future vendor touches", () => {
    const explanation = buildRiskExplanation({
      riskLevel: "normal",
      status: "on-track",
      revenueExposureUsd: 8_000,
      dueDate: utcDate(2026, 7, 20),
      lastVendorTouchDate: utcDate(2026, 6, 4),
      history: [],
      now: utcDate(2026, 6, 1),
    });

    const scheduled = explanation.reasons.find((r) => /scheduled/i.test(r));
    expect(scheduled).toBe("Vendor touch is scheduled in 3 days.");
    expect(scheduled).not.toMatch(/ago/i);
  });
});
