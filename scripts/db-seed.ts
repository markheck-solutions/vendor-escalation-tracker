import { SEED_DELIVERIES } from "../lib/data/seed";

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required to seed. Copy .env.example to .env.local and set DATABASE_URL.",
    );
  }

  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });

  try {
    const client = await pool.connect();
    try {
      await client.query("begin");

      // Enums (idempotent).
      await client.query(`
do $$
begin
  create type delivery_status as enum ('on-track', 'at-risk', 'blocked', 'escalated');
exception
  when duplicate_object then null;
end $$;
`);

      await client.query("alter type delivery_status add value if not exists 'on-track';");
      await client.query("alter type delivery_status add value if not exists 'at-risk';");
      await client.query("alter type delivery_status add value if not exists 'blocked';");
      await client.query("alter type delivery_status add value if not exists 'escalated';");

      await client.query(`
do $$
begin
  create type risk_level as enum ('normal', 'low', 'medium', 'high');
exception
  when duplicate_object then null;
end $$;
`);

      // If the enum already exists (from earlier attempts), ensure required values exist.
      await client.query("alter type risk_level add value if not exists 'normal';");
      await client.query("alter type risk_level add value if not exists 'low';");
      await client.query("alter type risk_level add value if not exists 'medium';");
      await client.query("alter type risk_level add value if not exists 'high';");

      // Table (idempotent).
      await client.query(`
create table if not exists public.deliveries (
  id text primary key,
  customer_alias text not null,
  vendor_alias text not null,
  service_alias text not null,
  market text not null,
  status delivery_status not null,
  risk_level risk_level not null,
  revenue_exposure_usd integer not null,
  due_date timestamp without time zone not null,
  last_vendor_touch_date timestamp without time zone not null,
  blocker text not null,
  owner_alias text not null,
  next_action text not null
);
`);

      // Read-only posture for public roles.
      await client.query("alter table public.deliveries enable row level security;");
      await client.query(`
do $$
begin
  revoke all on public.deliveries from anon, authenticated;
  grant select on public.deliveries to anon, authenticated;
exception
  when undefined_object then null;
end $$;
`);

      await client.query("drop policy if exists deliveries_read_anon on public.deliveries;");
      await client.query(`
create policy deliveries_read_anon
on public.deliveries
for select
to anon
using (true);
`);

      await client.query("drop policy if exists deliveries_read_authenticated on public.deliveries;");
      await client.query(`
create policy deliveries_read_authenticated
on public.deliveries
for select
to authenticated
using (true);
`);

      // Upsert the deterministic dataset.
      const ids = SEED_DELIVERIES.map((d) => d.id);

      if (ids.length === 0) {
        throw new Error("Seed dataset is empty. Refusing to seed.");
      }

      // Delete anything outside the known demo set for a clean, repeatable dataset.
      await client.query("delete from public.deliveries where not (id = any($1::text[]));", [
        ids,
      ]);

      for (const d of SEED_DELIVERIES) {
        await client.query(
          `
insert into public.deliveries (
  id,
  customer_alias,
  vendor_alias,
  service_alias,
  market,
  status,
  risk_level,
  revenue_exposure_usd,
  due_date,
  last_vendor_touch_date,
  blocker,
  owner_alias,
  next_action
) values (
  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
) on conflict (id) do update set
  customer_alias = excluded.customer_alias,
  vendor_alias = excluded.vendor_alias,
  service_alias = excluded.service_alias,
  market = excluded.market,
  status = excluded.status,
  risk_level = excluded.risk_level,
  revenue_exposure_usd = excluded.revenue_exposure_usd,
  due_date = excluded.due_date,
  last_vendor_touch_date = excluded.last_vendor_touch_date,
  blocker = excluded.blocker,
  owner_alias = excluded.owner_alias,
  next_action = excluded.next_action;
`,
          [
            d.id,
            d.customerAlias,
            d.vendorAlias,
            d.serviceAlias,
            d.market,
            d.status,
            d.riskLevel,
            d.revenueExposureUsd,
            d.dueDate,
            d.lastVendorTouchDate,
            d.blocker,
            d.ownerAlias,
            d.nextAction,
          ],
        );
      }

      await client.query("commit");

      const { rows } = await client.query(
        "select count(*)::int as count from public.deliveries where id = any($1::text[]);",
        [ids],
      );
      const count = rows[0]?.count ?? 0;
      console.log(`Seed complete. Demo deliveries: ${count}`);
    } catch {
      await client.query("rollback");
      throw new Error("Seed failed. No changes were committed.");
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
