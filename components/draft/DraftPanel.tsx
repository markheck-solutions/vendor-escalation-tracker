"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DeliveryDetailDto } from "@/lib/detail/types";

type DraftType = "status-request" | "escalation" | "executive-update";
type DraftTone = "collaborative" | "direct" | "urgent";

type DraftOptions = { type: DraftType; tone: DraftTone };

type DraftState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success"; deliveryId: string; options: DraftOptions; draftText: string }
  | { state: "error"; message: string };

function typeLabel(type: DraftType): string {
  switch (type) {
    case "status-request":
      return "Status request";
    case "escalation":
      return "Escalation";
    case "executive-update":
      return "Executive update";
  }
}

function toneLabel(tone: DraftTone): string {
  switch (tone) {
    case "collaborative":
      return "Collaborative";
    case "direct":
      return "Direct";
    case "urgent":
      return "Urgent";
  }
}

function safeUserMessageFromStatus(status: number): string {
  if (status === 400) return "The draft request was not accepted. Please try again.";
  if (status === 404) return "That delivery is no longer available. Pick another item from the queue.";
  return "Draft generation is temporarily unavailable.";
}

export function DraftPanel(props: { delivery: DeliveryDetailDto }) {
  const { delivery } = props;

  const [options, setOptions] = useState<DraftOptions>({
    type: "status-request",
    tone: "collaborative",
  });

  const [draft, setDraft] = useState<DraftState>({ state: "idle" });
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const copyTimeoutRef = useRef<number | null>(null);
  const requestSeqRef = useRef(0);
  const inFlightControllerRef = useRef<AbortController | null>(null);
  const selectedDeliveryIdRef = useRef(delivery.id);

  const clearCopyStateSoon = useCallback(() => {
    if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = window.setTimeout(() => setCopyState("idle"), 1800);
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Clear stale drafts when the selected delivery changes.
  useEffect(() => {
    selectedDeliveryIdRef.current = delivery.id;
    // Abort any in-flight request for the prior delivery before clearing state.
    inFlightControllerRef.current?.abort();
    inFlightControllerRef.current = null;
    // Bump the sequence so late responses from older requests can't set state.
    requestSeqRef.current += 1;

    // Avoid calling setState synchronously within an effect body.
    // (eslint-config-next flags that as a performance footgun.)
    queueMicrotask(() => {
      setDraft({ state: "idle" });
      setCopyState("idle");
    });
  }, [delivery.id]);

  const isDraftForCurrentDelivery = draft.state === "success" && draft.deliveryId === delivery.id;
  const isDraftForCurrentOptions =
    draft.state === "success" &&
    draft.options.type === options.type &&
    draft.options.tone === options.tone;
  const isDraftStale = isDraftForCurrentDelivery && !isDraftForCurrentOptions;

  const canCopy = isDraftForCurrentDelivery && isDraftForCurrentOptions;

  const onGenerate = useCallback(async () => {
    const requestedDeliveryId = delivery.id;
    const requestedOptions = options;
    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;

    // Cancel any previous in-flight request for safety and determinism.
    inFlightControllerRef.current?.abort();
    const controller = new AbortController();
    inFlightControllerRef.current = controller;

    setCopyState("idle");
    setDraft({ state: "loading" });

    try {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deliveryId: requestedDeliveryId, options: requestedOptions }),
        signal: controller.signal,
      });

      // Ignore late responses from aborted/stale requests or prior delivery selections.
      if (
        controller.signal.aborted ||
        requestSeqRef.current !== seq ||
        selectedDeliveryIdRef.current !== requestedDeliveryId
      ) {
        return;
      }

      if (!res.ok) {
        // Prefer safe server-provided copy when present, but fall back to controlled status-based copy.
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        const message = body?.error?.message?.trim();
        setDraft({
          state: "error",
          message: message && message.length < 180 ? message : safeUserMessageFromStatus(res.status),
        });
        return;
      }

      const body = (await res.json()) as {
        draft?: { deliveryId: string; options: DraftOptions; draftText: string };
      };

      const received = body.draft?.draftText;
      if (!received) {
        setDraft({ state: "error", message: "Draft generation returned an unexpected response." });
        return;
      }

      if (body.draft!.deliveryId !== requestedDeliveryId) {
        setDraft({ state: "error", message: "Draft generation returned an unexpected response." });
        return;
      }

      if (
        body.draft!.options.type !== requestedOptions.type ||
        body.draft!.options.tone !== requestedOptions.tone
      ) {
        setDraft({ state: "error", message: "Draft generation returned an unexpected response." });
        return;
      }

      setDraft({
        state: "success",
        deliveryId: body.draft!.deliveryId,
        options: body.draft!.options,
        draftText: body.draft!.draftText,
      });
    } catch {
      if (controller.signal.aborted) return;
      if (requestSeqRef.current !== seq || selectedDeliveryIdRef.current !== requestedDeliveryId) return;
      setDraft({ state: "error", message: "Draft generation failed due to a network issue." });
    }
  }, [delivery.id, options]);

  const draftText = draft.state === "success" ? draft.draftText : "";

  const onCopy = useCallback(async () => {
    if (!canCopy) return;

    try {
      await navigator.clipboard.writeText(draftText);
      setCopyState("copied");
      clearCopyStateSoon();
    } catch {
      // Fallback: best-effort selection copy for older browser contexts.
      try {
        const textarea = document.createElement("textarea");
        textarea.value = draftText;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.top = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopyState("copied");
        clearCopyStateSoon();
      } catch {
        setCopyState("error");
        clearCopyStateSoon();
      }
    }
  }, [canCopy, clearCopyStateSoon, draftText]);

  const headerSubtitle = useMemo(() => {
    return `${delivery.customerAlias} · ${delivery.vendorAlias} · ${delivery.serviceAlias}`;
  }, [delivery.customerAlias, delivery.serviceAlias, delivery.vendorAlias]);

  const copyAriaLabel = canCopy
    ? "Copy the generated draft"
    : isDraftStale
      ? "Copy draft (disabled until a fresh draft is generated for the current type and tone)"
      : "Copy draft (disabled until a draft is generated)";

  return (
    <section
      aria-label="Follow-up draft generator"
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            Follow-up draft (mock)
          </h3>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Generate a demo-safe vendor follow-up draft for the selected delivery. The only outbound action is Copy.
          </p>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
            Context: <span className="font-medium text-zinc-800 dark:text-zinc-200">{headerSubtitle}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={draft.state === "loading"}
            className="h-[44px] rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
          >
            {draft.state === "loading" ? "Generating…" : "Generate"}
          </button>
          <button
            type="button"
            onClick={onCopy}
            disabled={!canCopy}
            className="h-[44px] rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
            aria-label={copyAriaLabel}
          >
            Copy
          </button>

          <span className="text-xs text-zinc-500 dark:text-zinc-500" aria-live="polite">
            {copyState === "copied" ? "Copied." : copyState === "error" ? "Copy failed." : null}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="draft-type" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Draft type
          </label>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-500">
            Applied on the next Generate action.
          </p>
          <select
            id="draft-type"
            value={options.type}
            onChange={(e) => setOptions((prev) => ({ ...prev, type: e.target.value as DraftType }))}
            disabled={draft.state === "loading"}
            className="mt-2 h-[44px] w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
          >
            {(["status-request", "escalation", "executive-update"] as const).map((t) => (
              <option key={t} value={t}>
                {typeLabel(t)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="draft-tone" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Tone
          </label>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-500">
            Applied on the next Generate action.
          </p>
          <select
            id="draft-tone"
            value={options.tone}
            onChange={(e) => setOptions((prev) => ({ ...prev, tone: e.target.value as DraftTone }))}
            disabled={draft.state === "loading"}
            className="mt-2 h-[44px] w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
          >
            {(["collaborative", "direct", "urgent"] as const).map((t) => (
              <option key={t} value={t}>
                {toneLabel(t)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        {draft.state === "idle" ? (
          <div className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-200" role="status">
            Choose a type and tone, then generate a draft. Draft generation does not update or save delivery records.
          </div>
        ) : null}

        {draft.state === "loading" ? (
          <div className="space-y-3" role="status" aria-live="polite">
            <div className="h-4 w-40 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
          </div>
        ) : null}

        {draft.state === "error" ? (
          <div
            className="rounded-lg border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            role="alert"
          >
            <p className="font-medium text-zinc-900 dark:text-zinc-100">Draft unavailable</p>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">{draft.message}</p>
            <div className="mt-3">
              <button
                type="button"
                onClick={onGenerate}
                className="h-[44px] rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              >
                Try again
              </button>
            </div>
          </div>
        ) : null}

        {draft.state === "success" ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Generated draft ({typeLabel(draft.options.type)} · {toneLabel(draft.options.tone)})
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-500 tabular-nums">
                Delivery ID: {draft.deliveryId}
              </p>
            </div>

            {isDraftStale ? (
              <p
                className="mt-2 text-xs text-amber-700 dark:text-amber-300"
                role="status"
                aria-live="polite"
              >
                Options changed. Generate again to refresh this draft before copying.
              </p>
            ) : null}

            <pre
              className="mt-3 max-h-72 overflow-auto rounded-md bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-900 dark:bg-zinc-900/40 dark:text-zinc-100"
              aria-label="Generated draft text"
            >
              {draft.draftText}
            </pre>
          </div>
        ) : null}
      </div>
    </section>
  );
}
