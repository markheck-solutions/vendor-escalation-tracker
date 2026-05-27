import { describe, expect, it } from "vitest";

import { SEED_DELIVERIES } from "@/lib/data/seed";

describe("SEED_DELIVERIES", () => {
  it("has stable, unique ids", () => {
    expect(SEED_DELIVERIES.length).toBeGreaterThan(3);

    const ids = SEED_DELIVERIES.map((d) => d.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);

    for (const id of ids) {
      expect(id).toMatch(/^deliv_\d{4}$/);
    }
  });

  it("covers normal/low/medium/high risk levels", () => {
    const levels = new Set(SEED_DELIVERIES.map((d) => d.riskLevel));
    expect(levels.has("normal")).toBe(true);
    expect(levels.has("low")).toBe(true);
    expect(levels.has("medium")).toBe(true);
    expect(levels.has("high")).toBe(true);
  });
});
