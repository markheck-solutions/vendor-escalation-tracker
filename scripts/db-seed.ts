import { SEED_DELIVERIES } from "../lib/data/seed";

async function main() {
  // Scaffold-only: future slices will connect to Supabase/Postgres and insert the deterministic dataset.
  // Keeping this script present makes `npm run db:seed` stable early in the mission.
  console.log(`Seed not implemented yet. Planned rows: ${SEED_DELIVERIES.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
