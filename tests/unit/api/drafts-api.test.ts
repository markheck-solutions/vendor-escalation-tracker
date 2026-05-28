import { afterEach, describe, expect, it } from "vitest";
import http from "node:http";

import { DELETE, GET, PATCH, POST as postDrafts, PUT } from "@/app/api/drafts/route";
import { GET as getDeliveryDetail } from "@/app/api/deliveries/[id]/route";
import { getDeliveryRepository } from "@/lib/data/repository-factory";

async function withPatchedEnv<T>(
  patch: Record<string, string | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
  const prev: Record<string, string | undefined> = {};
  for (const key of Object.keys(patch)) prev[key] = process.env[key];

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe("/api/drafts", () => {
  afterEach(async () => {
    // Ensure draft tests never leak private provider selection into later tests.
    delete process.env.AI_PROVIDER;
    delete process.env.OPENAI_COMPATIBLE_BASE_URL;
    delete process.env.OPENAI_COMPATIBLE_API_KEY;
    delete process.env.OPENAI_COMPATIBLE_MODEL;
  });

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

  it("rejects unsupported methods with controlled 405 JSON", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.error?.code).toBe("method_not_allowed");

    const res2 = await PUT();
    expect(res2.status).toBe(405);

    const res3 = await PATCH();
    expect(res3.status).toBe(405);

    const res4 = await DELETE();
    expect(res4.status).toBe(405);
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

    // Type differences should be obvious in the body, not just the subject line.
    expect(statusBody.draft?.draftText).toContain("Subject: Quick status check");
    expect(statusBody.draft?.draftText).toContain("updated ETA");
    expect(statusBody.draft?.draftText).toContain("next concrete step");

    expect(escalationBody.draft?.draftText).toContain("Subject: Escalation needed");
    expect(escalationBody.draft?.draftText).toMatch(/ownership|owner/i);
    expect(escalationBody.draft?.draftText).toMatch(/action needed|escalat/i);

    // Tone differences should affect action language beyond only the greeting.
    expect(statusBody.draft?.draftText).toContain("\nHello,\n");
    expect(statusBody.draft?.draftText).toMatch(/please provide|please confirm/i);

    expect(urgentBody.draft?.draftText).toContain("\nHi,\n");
    expect(urgentBody.draft?.draftText).toMatch(/urgent|today|eod/i);
  });

  it("rejects malformed JSON with controlled 400 JSON", async () => {
    const res = await postDrafts(
      new Request("http://example.test/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"deliveryId":',
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.code).toBe("invalid_json");
  });

  it("rejects missing or malformed delivery ids safely", async () => {
    const missing = await postDrafts(
      new Request("http://example.test/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ options: { type: "status-request", tone: "direct" } }),
      }),
    );
    expect(missing.status).toBe(400);

    const malformed = await postDrafts(
      new Request("http://example.test/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          deliveryId: "not-a-valid-id",
          options: { type: "status-request", tone: "direct" },
        }),
      }),
    );
    expect(malformed.status).toBe(400);
  });

  it("rejects invalid draft options safely", async () => {
    const badType = await postDrafts(
      new Request("http://example.test/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          deliveryId: "deliv_0001",
          options: { type: "not-a-type", tone: "direct" },
        }),
      }),
    );
    expect(badType.status).toBe(400);

    const badTone = await postDrafts(
      new Request("http://example.test/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          deliveryId: "deliv_0001",
          options: { type: "status-request", tone: "not-a-tone" },
        }),
      }),
    );
    expect(badTone.status).toBe(400);
  });

  it("rejects provider override attempts via request body fields", async () => {
    const res = await postDrafts(
      new Request("http://example.test/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          deliveryId: "deliv_0001",
          options: { type: "status-request", tone: "direct" },
          provider: "openai-compatible",
        }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.code).toBe("invalid_request");
  });

  it("rejects nested override attempts inside the options object", async () => {
    const res = await postDrafts(
      new Request("http://example.test/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          deliveryId: "deliv_0001",
          options: { type: "status-request", tone: "direct", model: "override" },
        }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.code).toBe("invalid_request");
  });

  it("fails safely when private provider config is missing", async () => {
    const res = await withPatchedEnv(
      {
        AI_PROVIDER: "openai-compatible",
        OPENAI_COMPATIBLE_BASE_URL: undefined,
        OPENAI_COMPATIBLE_API_KEY: undefined,
        OPENAI_COMPATIBLE_MODEL: undefined,
      },
      async () =>
        postDrafts(
          new Request("http://example.test/api/drafts", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              deliveryId: "deliv_0001",
              options: { type: "status-request", tone: "direct" },
            }),
          }),
        ),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error?.code).toBe("provider_not_configured");
  });

  it("can call a safe local stub when private provider is configured", async () => {
    const seen: Array<{ url?: string; method?: string; headers: http.IncomingHttpHeaders; body: unknown }> = [];

    const server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        const parsed = raw ? (JSON.parse(raw) as unknown) : null;
        seen.push({ url: req.url, method: req.method, headers: req.headers, body: parsed });

        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({
            id: "stub_01",
            choices: [{ message: { role: "assistant", content: "STUB_DRAFT_TEXT" } }],
          }),
        );
      });
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("stub server did not start");
    const baseUrl = `http://127.0.0.1:${addr.port}`;

    try {
      const res = await withPatchedEnv(
        {
          AI_PROVIDER: "openai-compatible",
          OPENAI_COMPATIBLE_BASE_URL: baseUrl,
          OPENAI_COMPATIBLE_API_KEY: "sk-test-placeholder",
          OPENAI_COMPATIBLE_MODEL: "stub-model",
        },
        async () =>
          postDrafts(
            new Request("http://example.test/api/drafts", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                deliveryId: "deliv_0002",
                options: { type: "executive-update", tone: "collaborative" },
              }),
            }),
          ),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.draft?.draftText).toBe("STUB_DRAFT_TEXT");

      expect(seen.length).toBe(1);
      expect(seen[0]!.method).toBe("POST");
      expect(seen[0]!.url).toBe("/v1/chat/completions");

      const outbound = seen[0]!.body as { model?: string; messages?: unknown };
      expect(outbound.model).toBe("stub-model");
      expect(Array.isArray(outbound.messages)).toBe(true);

      // Outbound request should not include the entire delivery row.
      const rawBody = JSON.stringify(seen[0]!.body);
      expect(rawBody).toContain("Customer Birch");
      expect(rawBody).toContain("Vendor Atlas");
      expect(rawBody).not.toContain("revenueExposureUsd");
      expect(rawBody).not.toContain("DATABASE_URL");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    }
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
