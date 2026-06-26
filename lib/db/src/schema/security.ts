import { pgTable, serial, integer, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const securityWhitelistTable = pgTable("security_whitelist", {
  id:        serial("id").primaryKey(),
  ip:        text("ip").notNull().unique(),
  label:     text("label").notNull().default(""),
  addedBy:   integer("added_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const securityEventsTable = pgTable("security_events", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  ip:          text("ip").notNull().default("unknown"),
  email:       text("email"),
  type:        text("type").notNull(),
  severity:    text("severity").notNull().default("medium"),
  details:     jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  autoBanned:  boolean("auto_banned").notNull().default(false),
  resolved:    boolean("resolved").notNull().default(false),
  resolvedBy:  integer("resolved_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const securityBansTable = pgTable("security_bans", {
  id:        serial("id").primaryKey(),
  ip:        text("ip"),
  email:     text("email"),
  userId:    integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  reason:    text("reason").notNull(),
  bannedBy:  integer("banned_by").references(() => usersTable.id, { onDelete: "set null" }),
  eventId:   integer("event_id").references(() => securityEventsTable.id, { onDelete: "set null" }),
  active:    boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
});
