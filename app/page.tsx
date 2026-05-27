import { DemoModeBadge } from "@/components/demo/DemoModeBadge";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { Suspense } from "react";

export default function Home() {
  return (
    <div className="flex flex-1 bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              Vendor Escalation Tracker
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              Demo-safe risk dashboard for stale vendor follow-ups, revenue exposure, and
              the next best action across circuit deliveries.
            </p>
          </div>
          <DemoModeBadge />
        </header>

        <Suspense fallback={<div className="text-sm text-zinc-600 dark:text-zinc-400">Loading dashboard…</div>}>
          <Dashboard />
        </Suspense>
      </main>
    </div>
  );
}
