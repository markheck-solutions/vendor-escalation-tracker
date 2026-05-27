import fs from "node:fs";
import path from "node:path";

type EnvDict = Record<string, string | undefined>;

function stripOuterQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const idx = line.indexOf("=");
    if (idx <= 0) continue;

    const key = line.slice(0, idx).trim();
    const value = stripOuterQuotes(line.slice(idx + 1));

    if (!key) continue;
    out[key] = value;
  }

  return out;
}

export type LoadLocalEnvResult = {
  loadedFrom: string | null;
  loadedKeys: string[];
};

/**
 * Best-effort local env loader for Node scripts (e.g. `npm run db:seed`).
 *
 * Next.js loads `.env.local` automatically for app/runtime code, but standalone
 * scripts invoked via `tsx` do not. This helper loads env files without
 * printing values and (by default) does not override already-set env vars.
 */
export function loadLocalEnv(options?: {
  cwd?: string;
  env?: EnvDict;
  envFilePaths?: string[];
  overrideExisting?: boolean;
}): LoadLocalEnvResult {
  const cwd = options?.cwd ?? process.cwd();
  const env = options?.env ?? process.env;
  const envFilePaths = options?.envFilePaths ?? [".env.local", ".env"];
  const overrideExisting = options?.overrideExisting ?? false;

  for (const candidate of envFilePaths) {
    const fullPath = path.isAbsolute(candidate) ? candidate : path.join(cwd, candidate);
    if (!fs.existsSync(fullPath)) continue;

    const fileText = fs.readFileSync(fullPath, "utf8");
    const parsed = parseEnvFile(fileText);

    const loadedKeys: string[] = [];
    for (const [key, value] of Object.entries(parsed)) {
      if (!overrideExisting && env[key] !== undefined) continue;
      env[key] = value;
      loadedKeys.push(key);
    }

    return { loadedFrom: fullPath, loadedKeys };
  }

  return { loadedFrom: null, loadedKeys: [] };
}
