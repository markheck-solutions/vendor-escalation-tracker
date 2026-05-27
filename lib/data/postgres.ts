import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

declare global {
  var __vendorEscalationTrackerPgPool: Pool | undefined;
}

export type AppDb = NodePgDatabase<typeof schema>;

export function getDb(databaseUrl: string): { db: AppDb; pool: Pool } {
  const url = new URL(databaseUrl);
  const sslMode = url.searchParams.get("sslmode");
  const needsTls =
    sslMode === "require" ||
    sslMode === "verify-full" ||
    url.searchParams.get("ssl") === "true" ||
    url.hostname.endsWith(".supabase.co");

  const pool =
    globalThis.__vendorEscalationTrackerPgPool ??
    new Pool({
      connectionString: databaseUrl,
      ssl: needsTls ? { rejectUnauthorized: false } : undefined,
      max: 5,
    });

  globalThis.__vendorEscalationTrackerPgPool = pool;

  const db = drizzle(pool, { schema });
  return { db, pool };
}
