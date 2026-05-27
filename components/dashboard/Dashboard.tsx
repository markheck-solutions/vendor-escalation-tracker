"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { DashboardMetrics, DeliveryDto } from "@/lib/dashboard/metrics";
import { diffUtcDays } from "@/lib/risk/time";

type LoadState<T> =
  | { state: "loading" }
  | { state: "success"; data: T }
  | { state: "error"; message: string };

function formatUsdCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${Math.round(value)}`;
}

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function riskTone(risk: DeliveryDto["riskLevel"]): { label: string; className: string } {
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

function statusTone(status: DeliveryDto["status"]): { label: string; className: string } {
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

function MetricCard(props: {
  title: string;
  value: string;
  helper: string;
  subtle?: string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const { title, value, helper, subtle, loading, error, onRetry } = props;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 w-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          )}
        </div>

        {error ? (
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Retry
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p>
      ) : (
        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{helper}</p>
      )}

      {subtle ? (
        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-500">{subtle}</p>
      ) : null}
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="h-4 w-56 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-5 w-24 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900" />
          </div>
          <div className="mt-3 h-4 w-80 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
        </div>
      ))}
    </div>
  );
}

function QueueError(props: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="font-medium text-zinc-900 dark:text-zinc-100">Unable to load the priority queue.</p>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">{props.message}</p>
      <button
        type="button"
        onClick={props.onRetry}
        className="mt-4 inline-flex rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        Retry queue
      </button>
    </div>
  );
}

function QueueCard(props: { delivery: DeliveryDto; now: Date }) {
  const { delivery, now } = props;
  const risk = riskTone(delivery.riskLevel);
  const status = statusTone(delivery.status);

  const due = useMemo(() => new Date(delivery.dueDate), [delivery.dueDate]);
  const lastTouch = useMemo(() => new Date(delivery.lastVendorTouchDate), [delivery.lastVendorTouchDate]);

  const daysUntilDue = Number.isNaN(due.getTime()) ? null : diffUtcDays(due, now);
  const daysSinceTouch = Number.isNaN(lastTouch.getTime()) ? null : diffUtcDays(now, lastTouch);

  const dueDateLabel = Number.isNaN(due.getTime())
    ? "Unknown"
    : due.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const dueDeltaLabel =
    daysUntilDue === null
      ? "unknown"
      : daysUntilDue < 0
        ? `past due ${Math.abs(daysUntilDue)}d`
        : daysUntilDue === 0
          ? "due today"
          : `in ${daysUntilDue}d`;

  const touchDateLabel = Number.isNaN(lastTouch.getTime())
    ? "Unknown"
    : lastTouch.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const touchDeltaLabel =
    daysSinceTouch === null
      ? "unknown"
      : daysSinceTouch < 0
        ? "scheduled"
        : daysSinceTouch === 0
          ? "today"
          : `${daysSinceTouch}d ago`;

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            {delivery.serviceAlias}{" "}
            <span className="text-zinc-500 dark:text-zinc-400">· {delivery.market}</span>
          </p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            {delivery.customerAlias} · {delivery.vendorAlias} · {delivery.ownerAlias}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${risk.className}`}>
            {risk.label}
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${status.className}`}>
            {status.label}
          </span>
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-zinc-700 dark:text-zinc-300 sm:grid-cols-4">
        <div>
          <dt className="text-zinc-500 dark:text-zinc-500">Exposure</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{formatUsdCompact(delivery.revenueExposureUsd)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-500">Due</dt>
          <dd className="mt-0.5 font-medium">
            {dueDateLabel}{" "}
            <span className="text-zinc-500 dark:text-zinc-500">({dueDeltaLabel})</span>
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-500">Vendor touch</dt>
          <dd className="mt-0.5 font-medium">
            {touchDateLabel}{" "}
            <span className="text-zinc-500 dark:text-zinc-500">({touchDeltaLabel})</span>
            {delivery.staleFollowUp ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                Stale
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-500">Revenue</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{formatUsd(delivery.revenueExposureUsd)}</dd>
        </div>
      </dl>

      <div className="mt-3 grid gap-2 text-sm">
        <p className="text-sm text-zinc-800 dark:text-zinc-200">
          <span className="font-medium text-zinc-950 dark:text-zinc-50">Blocker:</span>{" "}
          {delivery.blocker}
        </p>
        <p className="text-sm text-zinc-800 dark:text-zinc-200">
          <span className="font-medium text-zinc-950 dark:text-zinc-50">Next:</span> {delivery.nextAction}
        </p>
      </div>
    </article>
  );
}

export function Dashboard() {
  const [metrics, setMetrics] = useState<LoadState<DashboardMetrics>>({ state: "loading" });
  const [deliveries, setDeliveries] = useState<LoadState<DeliveryDto[]>>({ state: "loading" });

  const now = useMemo(() => new Date(), []);

  const loadMetrics = useCallback(async () => {
    setMetrics({ state: "loading" });
    try {
      const res = await fetch("/api/dashboard/metrics", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { metrics?: DashboardMetrics };
      if (!body.metrics) throw new Error("Malformed response");
      setMetrics({ state: "success", data: body.metrics });
    } catch {
      setMetrics({ state: "error", message: "Metrics are temporarily unavailable." });
    }
  }, []);

  const loadDeliveries = useCallback(async () => {
    setDeliveries({ state: "loading" });
    try {
      const res = await fetch("/api/deliveries", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { deliveries?: DeliveryDto[] };
      if (!Array.isArray(body.deliveries)) throw new Error("Malformed response");
      setDeliveries({ state: "success", data: body.deliveries });
    } catch {
      setDeliveries({ state: "error", message: "Priority data is temporarily unavailable." });
    }
  }, []);

  useEffect(() => {
    // Avoid calling setState synchronously within an effect body.
    // (eslint-config-next flags that as a performance footgun.)
    queueMicrotask(() => {
      void loadMetrics();
      void loadDeliveries();
    });
  }, [loadDeliveries, loadMetrics]);

  const metricsLoading = metrics.state === "loading";
  const metricsError = metrics.state === "error" ? metrics.message : undefined;

  const deliveriesCount =
    deliveries.state === "success" ? deliveries.data.length : metrics.state === "success" ? metrics.data.totalDeliveries : null;

  const reconcilesNote = deliveriesCount === null ? undefined : `Based on ${deliveriesCount} demo deliveries.`;

  const metricsAvailable = metrics.state === "success";

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Key risk indicators">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Revenue exposure"
            value={metricsAvailable ? formatUsd(metrics.data.revenueExposureUsd) : "—"}
            helper="Medium + high risk exposure."
            subtle={reconcilesNote}
            loading={metricsLoading}
            error={metricsError}
            onRetry={loadMetrics}
          />
          <MetricCard
            title="Stale follow-ups"
            value={metricsAvailable ? metrics.data.staleFollowUps.toLocaleString("en-US") : "—"}
            helper="No vendor touch in 7+ days."
            subtle={reconcilesNote}
            loading={metricsLoading}
            error={metricsError}
            onRetry={loadMetrics}
          />
          <MetricCard
            title="At-risk deliveries"
            value={metricsAvailable ? metrics.data.atRiskDeliveries.toLocaleString("en-US") : "—"}
            helper="Medium + high risk work in flight."
            subtle={reconcilesNote}
            loading={metricsLoading}
            error={metricsError}
            onRetry={loadMetrics}
          />
          <MetricCard
            title="Next actions"
            value={metricsAvailable ? metrics.data.nextActions.toLocaleString("en-US") : "—"}
            helper="Stale, blocked, escalated, or due soon."
            subtle={reconcilesNote}
            loading={metricsLoading}
            error={metricsError}
            onRetry={loadMetrics}
          />
        </div>
      </section>

      <section aria-label="Priority queue" className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Priority queue</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Highest risk first. Use this as your next-call list for vendor follow-ups and escalations.
            </p>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-500">
            {deliveries.state === "success" ? (
              <span className="tabular-nums">{deliveries.data.length} items</span>
            ) : null}
          </div>
        </header>

        <div className="mt-4">
          {deliveries.state === "loading" ? <QueueSkeleton /> : null}
          {deliveries.state === "error" ? (
            <QueueError message={deliveries.message} onRetry={loadDeliveries} />
          ) : null}
          {deliveries.state === "success" ? (
            <div className="space-y-3">
              {deliveries.data.map((d) => (
                <QueueCard key={d.id} delivery={d} now={now} />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
