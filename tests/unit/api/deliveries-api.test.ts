import { describe, expect, it } from "vitest";

import { GET as getDeliveries, POST as postDeliveries } from "@/app/api/deliveries/route";
import {
  DELETE as deleteDelivery,
  GET as getDelivery,
  POST as postDelivery,
} from "@/app/api/deliveries/[id]/route";

type DeliveryDto = {
  id: string;
  riskLevel: "normal" | "low" | "medium" | "high";
  revenueExposureUsd: number;
  blocker: string;
  nextAction: string;
  staleFollowUp: boolean;
};

describe("/api/deliveries", () => {
  it("returns seeded demo deliveries with varied risk levels", async () => {
    const res = await getDeliveries();
    expect(res.status).toBe(200);

    const body = (await res.json()) as { deliveries: DeliveryDto[] };
    expect(Array.isArray(body.deliveries)).toBe(true);
    expect(body.deliveries.length).toBeGreaterThan(3);

    const levels = new Set(body.deliveries.map((d) => d.riskLevel));
    expect(levels.has("normal")).toBe(true);
    expect(levels.has("low")).toBe(true);
    expect(levels.has("medium")).toBe(true);
    expect(levels.has("high")).toBe(true);

    const high = body.deliveries.find((d) => d.riskLevel === "high");
    expect(high).toBeTruthy();
    expect(typeof high?.revenueExposureUsd).toBe("number");
    expect(typeof high?.blocker).toBe("string");
    expect(typeof high?.nextAction).toBe("string");
    expect(typeof high?.staleFollowUp).toBe("boolean");
  });

  it("rejects writes with controlled 405 JSON", async () => {
    const res = await postDeliveries();
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.error?.code).toBe("method_not_allowed");
  });
});

describe("/api/deliveries/[id]", () => {
  it("returns a selected delivery by id", async () => {
    const res = await getDelivery(new Request("http://example.test"), {
      params: Promise.resolve({ id: "deliv_0001" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.delivery?.id).toBe("deliv_0001");
  });

  it("fails safely for malformed ids", async () => {
    const res = await getDelivery(new Request("http://example.test"), {
      params: Promise.resolve({ id: "not-a-valid-id" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.code).toBe("invalid_id");
  });

  it("fails safely for unknown ids", async () => {
    const res = await getDelivery(new Request("http://example.test"), {
      params: Promise.resolve({ id: "deliv_9999" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error?.code).toBe("not_found");
  });

  it("rejects writes with controlled 405 JSON", async () => {
    const res = await postDelivery();
    expect(res.status).toBe(405);

    const res2 = await deleteDelivery();
    expect(res2.status).toBe(405);
  });
});
