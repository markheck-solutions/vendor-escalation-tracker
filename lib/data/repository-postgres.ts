import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import type { DeliveryRepository } from "./repository";
import { deliveries } from "./schema";
import { getDb } from "./postgres";

export function createPostgresDeliveryRepository(args: {
  databaseUrl: string;
}): DeliveryRepository {
  const { db } = getDb(args.databaseUrl);

  return {
    async listDeliveries() {
      // Keep ordering deterministic and useful for the dashboard default.
      // A later slice can evolve this into a true priority model.
      const riskOrder = sql<number>`case ${deliveries.riskLevel}
        when 'high' then 0
        when 'medium' then 1
        when 'low' then 2
        else 3
      end`;

      return db
        .select()
        .from(deliveries)
        .orderBy(
          riskOrder,
          desc(deliveries.revenueExposureUsd),
          deliveries.dueDate,
        );
    },

    async getDeliveryById(id: string) {
      const rows = await db.select().from(deliveries).where(eq(deliveries.id, id)).limit(1);
      return rows[0] ?? null;
    },
  };
}
