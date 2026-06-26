import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const navItemsTable = pgTable("nav_items", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("navbar"),
  label: text("label").notNull(),
  href: text("href").notNull(),
  isVisible: boolean("is_visible").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type NavItem = typeof navItemsTable.$inferSelect;
