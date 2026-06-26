import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userActivityLogsTable = pgTable("user_activity_logs", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  action:      text("action").notNull(),          // e.g. login, enroll_course, complete_lesson …
  entityType:  text("entity_type"),               // course | lesson | problem | project | article
  entityId:    integer("entity_id"),
  entityTitle: text("entity_title"),
  metadata:    jsonb("metadata").$type<Record<string, unknown>>(),
  ip:          text("ip"),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
