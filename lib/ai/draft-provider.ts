import "server-only";

export type DraftType = "status-request" | "escalation" | "executive-update";
export type DraftTone = "collaborative" | "direct" | "urgent";

export type DraftOptions = {
  type: DraftType;
  tone: DraftTone;
};

export type DraftContext = {
  deliveryId: string;
  customerAlias: string;
  vendorAlias: string;
  serviceAlias: string;
  blocker: string;
  nextAction: string;
};

export type DraftResult = {
  draftText: string;
};

export interface DraftProvider {
  generateDraft(args: { context: DraftContext; options: DraftOptions }): Promise<DraftResult>;
}
