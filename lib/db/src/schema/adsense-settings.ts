import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const adsenseSettingsTable = pgTable("adsense_settings", {
  id:          serial("id").primaryKey(),
  enabled:     boolean("enabled").notNull().default(false),
  publisherId: text("publisher_id").notNull().default(""),
  autoAds:     boolean("auto_ads").notNull().default(false),
  adSlotTop:   text("ad_slot_top"),
  adSlotSide:  text("ad_slot_side"),
  adSlotBottom: text("ad_slot_bottom"),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

export type AdsenseSettings = typeof adsenseSettingsTable.$inferSelect;
