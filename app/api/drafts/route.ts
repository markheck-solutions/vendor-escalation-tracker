import { z } from "zod";

import { jsonError, jsonMethodNotAllowed } from "@/lib/api/responses";
import { mockDraftProvider } from "@/lib/ai/mock-provider";
import type { DraftContext, DraftOptions } from "@/lib/ai/draft-provider";
import { getDeliveryRepository } from "@/lib/data/repository-factory";
import type { DeliveryRow } from "@/lib/data/schema";

export const runtime = "nodejs";

const DraftOptionsSchema = z
  .object({
    type: z.enum(["status-request", "escalation", "executive-update"]),
    tone: z.enum(["collaborative", "direct", "urgent"]),
  })
  .strict();

const DraftRequestSchema = z
  .object({
    deliveryId: z.string().regex(/^deliv_\d{4}$/),
    options: DraftOptionsSchema,
  })
  .strict();

function toDraftContext(row: DeliveryRow): DraftContext {
  return {
    deliveryId: row.id,
    customerAlias: row.customerAlias,
    vendorAlias: row.vendorAlias,
    serviceAlias: row.serviceAlias,
    blocker: row.blocker,
    nextAction: row.nextAction,
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError({
      status: 400,
      code: "invalid_json",
      message: "Draft request body must be valid JSON.",
    });
  }

  const parsed = DraftRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError({
      status: 400,
      code: "invalid_request",
      message: "Draft request is missing or invalid.",
    });
  }

  const { deliveryId, options } = parsed.data as { deliveryId: string; options: DraftOptions };

  try {
    const repo = getDeliveryRepository();
    const delivery = await repo.getDeliveryById(deliveryId);

    if (!delivery) {
      return jsonError({
        status: 404,
        code: "not_found",
        message: "Delivery not found.",
      });
    }

    const context: DraftContext = toDraftContext(delivery);
    const result = await mockDraftProvider.generateDraft({ context, options });

    return Response.json({
      draft: {
        deliveryId,
        options,
        draftText: result.draftText,
      },
    });
  } catch {
    return jsonError({
      status: 500,
      code: "internal_error",
      message: "Unable to generate a demo draft.",
    });
  }
}

export async function GET() {
  return jsonMethodNotAllowed({ allowed: ["POST"] });
}

export async function PUT() {
  return jsonMethodNotAllowed({ allowed: ["POST"] });
}

export async function PATCH() {
  return jsonMethodNotAllowed({ allowed: ["POST"] });
}

export async function DELETE() {
  return jsonMethodNotAllowed({ allowed: ["POST"] });
}
