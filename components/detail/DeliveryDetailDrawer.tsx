"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DeliveryDetailDto, FollowUpEventDto } from "@/lib/detail/types";
import { diffUtcDays } from "@/lib/risk/time";
import { DraftPanel } from "@/components/draft/DraftPanel";

type LoadState<T> =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success"; data: T }
  | { state: "error"; deliveryId: string; message: string };

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatRelativeDays(args: { deltaDays: number | null; futureLabel: string }): string {
  if (args.deltaDays === null) return "unknown";
  if (args.deltaDays < 0) return `${args.futureLabel} ${Math.abs(args.deltaDays)}d`;
  if (args.deltaDays === 0) return "today";
  return `${args.deltaDays}d ago`;
}

function kindLabel(kind: FollowUpEventDto["kind"]): string {
  switch (kind) {
    case "follow_up_email":
      return "Email follow-up";
    case "follow_up_call":
      return "Call follow-up";
    case "internal_note":
      return "Internal note";
    case "escalation":
      return "Escalation";
    default:
      return "Vendor touch";
  }
}

function riskBadge(risk: DeliveryDetailDto["riskLevel"]): { label: string; className: string } {
  switch (risk) {
    case "high":
      return { label: "High risk", className: "bg-red-50 text-red-800 ring-red-200" };
    case "medium":
      return { label: "Medium risk", className: "bg-amber-50 text-amber-900 ring-amber-200" };
    case "low":
      return { label: "Low risk", className: "bg-sky-50 text-sky-900 ring-sky-200" };
    default:
      return { label: "Normal", className: "bg-zinc-50 text-zinc-800 ring-zinc-200" };
  }
}

function statusBadge(status: DeliveryDetailDto["status"]): { label: string; className: string } {
  switch (status) {
    case "escalated":
      return { label: "Escalated", className: "bg-red-50 text-red-800 ring-red-200" };
    case "blocked":
      return { label: "Blocked", className: "bg-orange-50 text-orange-900 ring-orange-200" };
    case "at-risk":
      return { label: "At risk", className: "bg-amber-50 text-amber-900 ring-amber-200" };
    default:
      return { label: "On track", className: "bg-emerald-50 text-emerald-900 ring-emerald-200" };
  }
}

function focusableElements(container: HTMLElement): HTMLElement[] {
  const nodes = container.querySelectorAll<HTMLElement>(
    [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(","),
  );

  return Array.from(nodes).filter((el) => !el.hasAttribute("aria-hidden"));
}

export function DeliveryDetailDrawer(props: {
  open: boolean;
  deliveryId: string | null;
  onClose: () => void;
}) {
  const { open, deliveryId, onClose } = props;

  const [state, setState] = useState<LoadState<DeliveryDetailDto>>({ state: "idle" });

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const load = useCallback(
    async (id: string, signal?: AbortSignal) => {
      setState({ state: "loading" });
      try {
        const res = await fetch(`/api/deliveries/${encodeURIComponent(id)}`, {
          cache: "no-store",
          signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { delivery?: DeliveryDetailDto };
        if (!body.delivery) throw new Error("Malformed response");
        setState({ state: "success", data: body.delivery });
      } catch {
        if (signal?.aborted) return;
        // Keep user-facing error copy controlled and demo-safe.
        setState({
          state: "error",
          deliveryId: id,
          message: "Details are temporarily unavailable.",
        });
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => setState({ state: "idle" }));
      return;
    }

    if (!deliveryId) return;

    const controller = new AbortController();
    // Avoid calling setState synchronously within an effect body.
    // (eslint-config-next flags that as a performance footgun.)
    queueMicrotask(() => {
      void load(deliveryId, controller.signal);
    });

    return () => controller.abort();
  }, [deliveryId, load, open]);

  useEffect(() => {
    if (!open) return;

    // Move focus into the dialog for keyboard users.
    queueMicrotask(() => {
      closeButtonRef.current?.focus();
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusables = focusableElements(dialog);
      if (focusables.length === 0) return;

      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;

      if (!active) return;

      if (e.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !dialog.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const detail =
    state.state === "success" && deliveryId && state.data.id === deliveryId ? state.data : null;

  const showLoading =
    open &&
    !!deliveryId &&
    (state.state === "idle" ||
      state.state === "loading" ||
      (state.state === "success" && state.data.id !== deliveryId) ||
      (state.state === "error" && state.deliveryId !== deliveryId));

  const now = useMemo(() => new Date(), []);

  const due = useMemo(() => (detail ? new Date(detail.dueDate) : null), [detail]);
  const lastTouch = useMemo(
    () => (detail ? new Date(detail.lastVendorTouchDate) : null),
    [detail],
  );

  const daysUntilDue = useMemo(() => {
    if (!due || Number.isNaN(due.getTime())) return null;
    return diffUtcDays(due, now);
  }, [due, now]);

  const daysSinceTouch = useMemo(() => {
    if (!lastTouch || Number.isNaN(lastTouch.getTime())) return null;
    return diffUtcDays(now, lastTouch);
  }, [lastTouch, now]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/30 backdrop-blur-[1px]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-labelledby="delivery-detail-title"
        className="h-full w-full max-w-xl overflow-y-auto border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 pointer-events-auto"
      >
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-5 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500">
                Delivery details (read-only)
              </p>
              <h2
                id="delivery-detail-title"
                className="mt-1 truncate text-base font-semibold text-zinc-950 dark:text-zinc-50"
              >
                {detail ? `${detail.serviceAlias} · ${detail.market}` : "Loading…"}
              </h2>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="h-[44px] rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              aria-label="Close delivery details"
            >
              Close
            </button>
          </div>

          {detail ? (
            <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
              Viewing{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {detail.customerAlias}
              </span>{" "}
              ·{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {detail.vendorAlias}
              </span>
            </p>
          ) : null}
        </header>

        <div className="px-5 py-5">
          {showLoading ? (
            <div className="space-y-4" role="status" aria-live="polite">
              <div className="h-6 w-60 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
              <div className="h-20 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
              <div className="h-28 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
              <div className="h-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
            </div>
          ) : null}

          {state.state === "error" && deliveryId && state.deliveryId === deliveryId ? (
            <div
              className="rounded-xl border border-zinc-200 bg-white p-5 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              role="alert"
            >
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                Unable to load details.
              </p>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">{state.message}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {deliveryId ? (
                  <button
                    type="button"
                    onClick={() => void load(deliveryId)}
                    className="h-[44px] rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                  >
                    Retry
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onClose}
                  className="h-[44px] rounded-md bg-zinc-900 px-3 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  Back to queue
                </button>
              </div>
            </div>
          ) : null}

          {detail ? (
            <div className="space-y-5">
              <section aria-label="Delivery identity" className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      {detail.customerAlias} · {detail.vendorAlias}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      Owner: {detail.ownerAlias}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(() => {
                      const risk = riskBadge(detail.riskLevel);
                      return (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${risk.className}`}
                        >
                          {risk.label}
                        </span>
                      );
                    })()}
                    {(() => {
                      const status = statusBadge(detail.status);
                      return (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${status.className}`}
                        >
                          {status.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-zinc-800 dark:text-zinc-200 sm:grid-cols-2">
                  <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/40">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Revenue exposure</dt>
                    <dd className="mt-1 font-semibold tabular-nums">{formatUsd(detail.revenueExposureUsd)}</dd>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/40">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Due date</dt>
                    <dd className="mt-1 font-semibold">
                      {due && !Number.isNaN(due.getTime())
                        ? due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "Unknown"}
                      {daysUntilDue !== null ? (
                        <span className="ml-2 text-xs font-medium text-zinc-500 dark:text-zinc-500">
                          ({daysUntilDue < 0 ? `past due ${Math.abs(daysUntilDue)}d` : `in ${daysUntilDue}d`})
                        </span>
                      ) : null}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/40">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Last vendor touch</dt>
                    <dd className="mt-1 font-semibold">
                      {lastTouch && !Number.isNaN(lastTouch.getTime())
                        ? lastTouch.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "Unknown"}
                      <span className="ml-2 text-xs font-medium text-zinc-500 dark:text-zinc-500">
                        ({formatRelativeDays({ deltaDays: daysSinceTouch, futureLabel: "scheduled in" })})
                      </span>
                      {detail.staleFollowUp ? (
                        <span className="ml-2 inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                          Stale
                        </span>
                      ) : null}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/40">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Blocker</dt>
                    <dd className="mt-1 font-medium">{detail.blocker}</dd>
                  </div>
                </dl>
              </section>

              <section aria-label="Next recommended action" className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Next action</h3>
                <p className="mt-2 text-sm text-zinc-800 dark:text-zinc-200">{detail.nextAction}</p>
              </section>

              <section aria-label="Risk explanation" className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {detail.riskExplanation?.headline ?? "Risk explanation"}
                </h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-800 dark:text-zinc-200">
                  {(detail.riskExplanation?.reasons ?? []).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </section>

              <section aria-label="Follow-up timeline" className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Follow-up timeline</h3>

                {detail.followUpHistory.length === 0 ? (
                  <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-200" role="status">
                    No follow-up history is logged for this delivery yet.
                  </div>
                ) : (
                  <ol className="mt-4 space-y-3">
                    {detail.followUpHistory.map((e) => {
                      const occurredAt = new Date(e.occurredAt);
                      const dateLabel = Number.isNaN(occurredAt.getTime())
                        ? "Unknown date"
                        : occurredAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          });

                      return (
                        <li
                          key={`${e.occurredAt}:${e.kind}:${e.summary}`}
                          className="rounded-lg border border-zinc-200 bg-white p-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 tabular-nums">
                              {dateLabel}
                            </p>
                            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                              {kindLabel(e.kind)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-zinc-900 dark:text-zinc-100">{e.summary}</p>
                          {e.source ? (
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{e.source}</p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>

              <DraftPanel delivery={detail} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
