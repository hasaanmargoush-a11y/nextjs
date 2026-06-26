import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const emailSettingsTable = pgTable("email_settings", {
  id:        serial("id").primaryKey(),
  host:      text("host").notNull().default("smtp.gmail.com"),
  port:      integer("port").notNull().default(587),
  secure:    boolean("secure").notNull().default(false),
  user:      text("user").notNull().default(""),
  pass:      text("pass").notNull().default(""),
  fromName:  text("from_name").notNull().default("منصة نوفيل"),
  fromEmail: text("from_email").notNull().default("noreply@nouvil.com"),
  enabled:   boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type EmailSettings = typeof emailSettingsTable.$inferSelect;
