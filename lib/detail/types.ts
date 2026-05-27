import type { DeliveryDto } from "@/lib/dashboard/metrics";

export type FollowUpEventKind =
  | "vendor_touch"
  | "follow_up_email"
  | "follow_up_call"
  | "internal_note"
  | "escalation";

export type FollowUpEventDto = {
  occurredAt: string; // ISO date string
  kind: FollowUpEventKind;
  summary: string;
  source?: string;
};

export type RiskExplanationDto = {
  headline: string;
  reasons: string[];
};

export type DeliveryDetailDto = DeliveryDto & {
  riskExplanation: RiskExplanationDto;
  followUpHistory: FollowUpEventDto[];
};
