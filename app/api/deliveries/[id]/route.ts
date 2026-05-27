import { jsonError, jsonMethodNotAllowed } from "@/lib/api/responses";
import { getDeliveryRepository } from "@/lib/data/repository-factory";
import type { DeliveryRow } from "@/lib/data/schema";
import { isStaleFollowUp } from "@/lib/risk/stale-follow-up";

export const runtime = "nodejs";

function isValidId(id: string): boolean {
  // Keep this deliberately strict for the demo surface to avoid accidental path tricks.
  return /^deliv_\d{4}$/.test(id);
}

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

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  if (!id || !isValidId(id)) {
    return jsonError({
      status: 400,
      code: "invalid_id",
      message: "Delivery id is missing or malformed.",
    });
  }

  try {
    const repo = getDeliveryRepository();
    const delivery = await repo.getDeliveryById(id);

    if (!delivery) {
      return jsonError({
        status: 404,
        code: "not_found",
        message: "Delivery not found.",
      });
    }

    return Response.json({ delivery: toDeliveryDto(delivery) });
  } catch {
    return jsonError({
      status: 500,
      code: "internal_error",
      message: "Unable to load the requested demo delivery.",
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
