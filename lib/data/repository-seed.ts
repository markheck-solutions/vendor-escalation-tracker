import "server-only";

import { SEED_DELIVERIES } from "./seed";
import type { DeliveryRow } from "./schema";
import type { DeliveryRepository } from "./repository";

const RISK_ORDER: Record<DeliveryRow["riskLevel"], number> = {
  high: 0,
  medium: 1,
  low: 2,
  normal: 3,
};

function toRow(seed: typeof SEED_DELIVERIES[number]): DeliveryRow {
  // Seed rows already match the table shape.
  return seed as unknown as DeliveryRow;
}

export function createSeedDeliveryRepository(): DeliveryRepository {
  const rows = SEED_DELIVERIES.map(toRow);

  return {
    async listDeliveries() {
      return [...rows].sort((a, b) => {
        const risk = RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel];
        if (risk !== 0) return risk;

        const exposure = b.revenueExposureUsd - a.revenueExposureUsd;
        if (exposure !== 0) return exposure;

        return a.dueDate.getTime() - b.dueDate.getTime();
      });
    },

    async getDeliveryById(id: string) {
      return rows.find((r) => r.id === id) ?? null;
    },
  };
}
