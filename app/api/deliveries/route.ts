import { jsonError, jsonMethodNotAllowed } from "@/lib/api/responses";
import { getDeliveryRepository } from "@/lib/data/repository-factory";
import type { DeliveryRow } from "@/lib/data/schema";
import { isStaleFollowUp } from "@/lib/risk/stale-follow-up";

export const runtime = "nodejs";

function toDeliveryDto(row: DeliveryRow) {
  return {
    id: row.id,
    customerAlias: row.customerAlias,
    vendorAlias: row.vendorAlias,
    serviceAlias: row.serviceAlias,
    market: row.market,
    status: row.status,
    riskLevel: row.riskLevel,
    revenueExposureUsd: row.revenueExposureUsd,
    dueDate: row.dueDate,
    lastVendorTouchDate: row.lastVendorTouchDate,
    staleFollowUp: isStaleFollowUp({ lastVendorTouchDate: row.lastVendorTouchDate }),
    blocker: row.blocker,
    ownerAlias: row.ownerAlias,
    nextAction: row.nextAction,
  };
}

export async function GET() {
  try {
    const repo = getDeliveryRepository();
    const deliveries = await repo.listDeliveries();
    return Response.json({ deliveries: deliveries.map(toDeliveryDto) });
  } catch {
    return jsonError({
      status: 500,
      code: "internal_error",
      message: "Unable to load demo deliveries.",
    });
  }
}

export async function POST() {
  return jsonMethodNotAllowed({ allowed: ["GET"] });
}

export async function PUT() {
  return jsonMethodNotAllowed({ allowed: ["GET"] });
}

export async function PATCH() {
  return jsonMethodNotAllowed({ allowed: ["GET"] });
}

export async function DELETE() {
  return jsonMethodNotAllowed({ allowed: ["GET"] });
}
