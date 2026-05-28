// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { DraftPanel } from "@/components/draft/DraftPanel";
import type { DeliveryDetailDto } from "@/lib/detail/types";

function delivery(id: string, overrides?: Partial<DeliveryDetailDto>): DeliveryDetailDto {
  return {
    id,
    customerAlias: "Customer A",
    vendorAlias: "Vendor A",
    serviceAlias: "Circuit A",
    market: "North",
    status: "on-track",
    riskLevel: "normal",
    revenueExposureUsd: 10_000,
    dueDate: "2026-06-01T00:00:00.000Z",
    lastVendorTouchDate: "2026-05-01T00:00:00.000Z",
    staleFollowUp: false,
    blocker: "Waiting on vendor schedule.",
    ownerAlias: "A. Rivera",
    nextAction: "Confirm the next vendor slot.",
    riskExplanation: { headline: "Low risk", reasons: ["Demo reason."] },
    followUpHistory: [],
    ...overrides,
  };
}

function jsonResponse(args: { ok: boolean; status: number; json: unknown }) {
  return {
    ok: args.ok,
    status: args.status,
    json: async () => args.json,
  };
}

describe("DraftPanel", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps Copy disabled until a draft is generated", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          ok: true,
          status: 200,
          json: {
            draft: {
              deliveryId: "deliv_0001",
              options: { type: "status-request", tone: "collaborative" },
              draftText: "Draft text for deliv_0001.",
            },
          },
        }),
      ),
    );

    render(<DraftPanel delivery={delivery("deliv_0001")} />);

    const copy = screen.getByRole("button", { name: /Copy/ }) as HTMLButtonElement;
    expect(copy.disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    // Wait for success state to render.
    await screen.findByLabelText("Generated draft text");
    expect(copy.disabled).toBe(false);
  });

  it("disables Copy after failures and supports safe retry recovery", async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          ok: false,
          status: 500,
          json: { error: { message: "Unable to generate a demo draft." } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          status: 200,
          json: {
            draft: {
              deliveryId: "deliv_0001",
              options: { type: "status-request", tone: "collaborative" },
              draftText: "Recovered draft text.",
            },
          },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<DraftPanel delivery={delivery("deliv_0001")} />);

    const copy = screen.getByRole("button", { name: /Copy/ }) as HTMLButtonElement;
    expect(copy.disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await screen.findByRole("alert");
    expect(screen.getByText("Draft unavailable")).toBeTruthy();
    expect(copy.disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    const draftText = await screen.findByLabelText("Generated draft text");
    expect(draftText.textContent).toContain("Recovered draft text.");
    expect(copy.disabled).toBe(false);
  });

  it("ignores stale in-flight /api/drafts responses after switching deliveries", async () => {
    let resolveFetch!: (value: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    vi.stubGlobal("fetch", vi.fn().mockReturnValue(fetchPromise));

    const { rerender } = render(<DraftPanel delivery={delivery("deliv_0001")} />);

    const copy = screen.getByRole("button", { name: /Copy/ }) as HTMLButtonElement;
    expect(copy.disabled).toBe(true);

    const generate = screen.getByRole("button", { name: "Generate" }) as HTMLButtonElement;
    fireEvent.click(generate);
    expect(generate.disabled).toBe(true);

    // Switch deliveries before the draft request resolves.
    rerender(<DraftPanel delivery={delivery("deliv_0002", { vendorAlias: "Vendor B" })} />);

    // Deliver a late success response for the original delivery.
    resolveFetch(
      jsonResponse({
        ok: true,
        status: 200,
        json: {
          draft: {
            deliveryId: "deliv_0001",
            options: { type: "status-request", tone: "collaborative" },
            draftText: "Late draft text for deliv_0001.",
          },
        },
      }),
    );

    // Allow promise microtasks to flush.
    await Promise.resolve();

    // The stale response must not render under the new delivery context, and Copy must remain disabled.
    expect(screen.queryByLabelText("Generated draft text")).toBeNull();
    expect((screen.getByRole("button", { name: /Copy/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("marks the prior draft as stale and disables Copy when draft options change", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          ok: true,
          status: 200,
          json: {
            draft: {
              deliveryId: "deliv_0001",
              options: { type: "status-request", tone: "collaborative" },
              draftText: "Draft text for deliv_0001.",
            },
          },
        }),
      ),
    );

    render(<DraftPanel delivery={delivery("deliv_0001")} />);

    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await screen.findByLabelText("Generated draft text");

    const copy = screen.getByRole("button", { name: /Copy/ }) as HTMLButtonElement;
    expect(copy.disabled).toBe(false);

    fireEvent.change(screen.getByLabelText("Draft type"), { target: { value: "escalation" } });

    // Prior draft must be treated as stale once the options no longer match.
    expect(screen.getByText(/Options changed/i)).toBeTruthy();
    expect((screen.getByRole("button", { name: /Copy/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("snapshots type and tone per Generate click and ignores late responses for older options", async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          status: 200,
          json: {
            draft: {
              deliveryId: "deliv_0001",
              options: { type: "status-request", tone: "collaborative" },
              draftText: "First draft text (status/collaborative).",
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          status: 200,
          json: {
            draft: {
              deliveryId: "deliv_0001",
              options: { type: "escalation", tone: "urgent" },
              draftText: "Second draft text (escalation/urgent).",
            },
          },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<DraftPanel delivery={delivery("deliv_0001")} />);

    // First generate uses the default options.
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await screen.findByLabelText("Generated draft text");

    // Change options before generating again.
    fireEvent.change(screen.getByLabelText("Draft type"), { target: { value: "escalation" } });
    fireEvent.change(screen.getByLabelText("Tone"), { target: { value: "urgent" } });

    // Second request should use the latest options.
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    const secondBody = (fetchMock.mock.calls[1]?.[1] as { body?: string } | undefined)?.body ?? "";
    expect(secondBody).toContain('"type":"escalation"');
    expect(secondBody).toContain('"tone":"urgent"');

    // Second response wins and should be reflected in the label and body.
    await screen.findByText((content) => content.includes("Generated draft (Escalation · Urgent)"));
    expect(screen.getByLabelText("Generated draft text").textContent).toContain(
      "Second draft text (escalation/urgent).",
    );
  });
});
