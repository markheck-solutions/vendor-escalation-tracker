import "server-only";

import { getServerEnv } from "@/lib/env";

import type { DeliveryRepository } from "./repository";
import { createPostgresDeliveryRepository } from "./repository-postgres";
import { createSeedDeliveryRepository } from "./repository-seed";

export function getDeliveryRepository(): DeliveryRepository {
  const env = getServerEnv();
  const databaseUrl = env.DATABASE_URL?.trim();

  if (databaseUrl) {
    return createPostgresDeliveryRepository({ databaseUrl });
  }

  return createSeedDeliveryRepository();
}
