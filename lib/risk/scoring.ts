export type RiskLevel = "normal" | "low" | "medium" | "high";

export function scoreDeliveryRisk(args: {
  revenueExposureUsd: number;
  dueDate: Date;
  lastVendorTouchDate: Date;
  isBlocked: boolean;
  followUpAttempts: number;
  now?: Date;
}): { level: RiskLevel; reasons: string[] } {
  // Placeholder implementation. A future slice will replace this with a fully deterministic, tested model.
  void args;
  return { level: "normal", reasons: ["Scaffold-only scoring is not implemented yet."] };
}
