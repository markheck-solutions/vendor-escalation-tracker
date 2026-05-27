import { describe, expect, it } from "vitest";

import { POST as postDrafts } from "@/app/api/drafts/route";
import { GET as getDeliveryDetail } from "@/app/api/deliveries/[id]/route";
import { getDeliveryRepository } from "@/lib/data/repository-factory";

describe("/api/drafts", () => {
  it("returns deterministic mock output for the same delivery and options", async () => {
    const payload = {
      deliveryId: "deliv_0001",
      options: { type: "status-request", tone: "collaborative" },
    } as const;

    const req1 = new Request("http://example.test/api/drafts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const req2 = new Request("http://example.test/api/drafts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res1 = await postDrafts(req1);
    const res2 = await postDrafts(req2);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const body1 = await res1.json();
    const body2 = await res2.json();

    expect(body2).toEqual(body1);
    expect(body1.draft?.draftText).toContain("Subject:");
  });

  it("honors draft type and tone in the generated text", async () => {
    const base = { deliveryId: "deliv_0001" } as const;

    const statusReq = await postDrafts(
      new Request("http://example.test/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...base, options: { type: "status-request", tone: "direct" } }),
      }),
    );
    expect(statusReq.status).toBe(200);
    const statusBody = await statusReq.json();

    const escalation = await postDrafts(
      new Request("http://example.test/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...base, options: { type: "escalation", tone: "direct" } }),
      }),
    );
    expect(escalation.status).toBe(200);
    const escalationBody = await escalation.json();

    const urgent = await postDrafts(
      new Request("http://example.test/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...base, options: { type: "status-request", tone: "urgent" } }),
      }),
    );
    expect(urgent.status).toBe(200);
    const urgentBody = await urgent.json();

    expect(statusBody.draft?.draftText).toContain("Subject: Quick status check");
    expect(escalationBody.draft?.draftText).toContain("Subject: Escalation needed");

    // Tone affects greeting wording in mock mode.
    expect(statusBody.draft?.draftText).toContain("\nHello,\n");
    expect(urgentBody.draft?.draftText).toContain("\nHi,\n");
  });

  it("uses the selected delivery context and does not mutate delivery data", async () => {
    const detailRes = await getDeliveryDetail(new Request("http://example.test"), {
      params: Promise.resolve({ id: "deliv_0002" }),
    });
    expect(detailRes.status).toBe(200);
    const detailBody = (await detailRes.json()) as { delivery?: { vendorAlias: string; customerAlias: string; blocker: string; nextAction: string; serviceAlias: string } };

    const repo = getDeliveryRepository();
    const before = structuredClone(await repo.getDeliveryById("deliv_0002"));

    const draftRes = await postDrafts(
      new Request("http://example.test/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          deliveryId: "deliv_0002",
          options: { type: "executive-update", tone: "collaborative" },
        }),
      }),
    );
    expect(draftRes.status).toBe(200);
    const draftBody = (await draftRes.json()) as { draft?: { draftText: string } };

    const text = draftBody.draft?.draftText ?? "";
    expect(text).toContain(detailBody.delivery!.vendorAlias);
    expect(text).toContain(detailBody.delivery!.customerAlias);
    expect(text).toContain(detailBody.delivery!.serviceAlias);
    expect(text).toContain(detailBody.delivery!.blocker);
    expect(text).toContain(detailBody.delivery!.nextAction);

    const after = structuredClone(await repo.getDeliveryById("deliv_0002"));
    expect(after).toEqual(before);
  });
});
