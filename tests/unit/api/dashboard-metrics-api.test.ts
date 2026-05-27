import { describe, expect, it } from "vitest";

import { GET as getDeliveries } from "@/app/api/deliveries/route";
import { GET as getMetrics } from "@/app/api/dashboard/metrics/route";
import { deriveDashboardMetrics, type DeliveryDto } from "@/lib/dashboard/metrics";

describe("/api/dashboard/metrics", () => {
  it("reconciles KPI totals with the delivery list API", async () => {
    const deliveriesRes = await getDeliveries();
    expect(deliveriesRes.status).toBe(200);
    const deliveriesBody = (await deliveriesRes.json()) as { deliveries: DeliveryDto[] };

    const metricsRes = await getMetrics();
    expect(metricsRes.status).toBe(200);
    const metricsBody = (await metricsRes.json()) as {
      metrics: {
        revenueExposureUsd: number;
        staleFollowUps: number;
        atRiskDeliveries: number;
        nextActions: number;
        totalDeliveries: number;
      };
    };

    // Recompute metrics from the same public delivery surface the UI uses.
    // We intentionally avoid freezing time since the demo's "next actions" depends on
    // a rolling due-date window and stale-follow-up evaluation.
    const reconciled = deriveDashboardMetrics({ deliveries: deliveriesBody.deliveries });

    expect(metricsBody.metrics.totalDeliveries).toBe(deliveriesBody.deliveries.length);

    // Metrics returned by the API should match what we can recompute from the delivery surface.
    // (This is the demo-safe reconciliation baseline validators rely on.)
    expect(metricsBody.metrics).toEqual({
      revenueExposureUsd: reconciled.revenueExposureUsd,
      staleFollowUps: reconciled.staleFollowUps,
      atRiskDeliveries: reconciled.atRiskDeliveries,
      nextActions: reconciled.nextActions,
      totalDeliveries: reconciled.totalDeliveries,
    });
  });

  it("delivers highest-risk items first by default", async () => {
    const res = await getDeliveries();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { deliveries: Array<Pick<DeliveryDto, "riskLevel" | "revenueExposureUsd">> };

    const riskRank: Record<DeliveryDto["riskLevel"], number> = {
      high: 0,
      medium: 1,
      low: 2,
      normal: 3,
    };

    for (let i = 1; i < body.deliveries.length; i++) {
      const prev = body.deliveries[i - 1]!;
      const cur = body.deliveries[i]!;

      const riskDiff = riskRank[prev.riskLevel] - riskRank[cur.riskLevel];
      expect(riskDiff).toBeLessThanOrEqual(0);

      if (riskRank[prev.riskLevel] === riskRank[cur.riskLevel]) {
        expect(prev.revenueExposureUsd).toBeGreaterThanOrEqual(cur.revenueExposureUsd);
      }
    }
  });
});
