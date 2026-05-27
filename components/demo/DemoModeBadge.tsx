import { getPublicEnv } from "@/lib/env/public";

export function DemoModeBadge() {
  const { NEXT_PUBLIC_DEMO_MODE } = getPublicEnv();
  if (NEXT_PUBLIC_DEMO_MODE !== "true") return null;

  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs font-medium text-zinc-700 shadow-sm">
      Demo Mode
    </span>
  );
}
