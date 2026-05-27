import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "on-track",
  "at-risk",
  "blocked",
  "escalated",
]);

export const riskLevelEnum = pgEnum("risk_level", ["normal", "low", "medium", "high"]);

export const deliveries = pgTable("deliveries", {
  id: text("id").primaryKey(),

  customerAlias: text("customer_alias").notNull(),
  vendorAlias: text("vendor_alias").notNull(),
  serviceAlias: text("service_alias").notNull(),
  market: text("market").notNull(),

  status: deliveryStatusEnum("status").notNull(),
  riskLevel: riskLevelEnum("risk_level").notNull(),

  revenueExposureUsd: integer("revenue_exposure_usd").notNull(),

  dueDate: timestamp("due_date", { withTimezone: false, mode: "date" }).notNull(),
  lastVendorTouchDate: timestamp("last_vendor_touch_date", {
    withTimezone: false,
    mode: "date",
  }).notNull(),

  blocker: text("blocker").notNull(),
  ownerAlias: text("owner_alias").notNull(),
  nextAction: text("next_action").notNull(),
});

export type DeliveryRow = typeof deliveries.$inferSelect;
export type DeliveryInsert = typeof deliveries.$inferInsert;
