import "server-only";

import type { DeliveryRow } from "./schema";

export type DeliveryRepository = {
  listDeliveries(): Promise<DeliveryRow[]>;
  getDeliveryById(id: string): Promise<DeliveryRow | null>;
};
