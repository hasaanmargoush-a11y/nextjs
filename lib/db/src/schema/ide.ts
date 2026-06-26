import { pgTable, text, serial, integer, timestamp, jsonb, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const ideProjectsTable = pgTable("ide_projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  blockId: text("block_id").notNull(),
  files: jsonb("files").$type<unknown[]>().notNull().default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("ide_projects_user_block_idx").on(table.userId, table.blockId),
]);

// ── Named / Saved User Projects ───────────────────────────────────────────────
export const userProjectsTable = pgTable("user_projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  howItWorks: text("how_it_works").notNull().default(""),
  requirements: text("requirements").notNull().default(""),
  files: jsonb("files").$type<unknown[]>().notNull().default([]),
  tags: text("tags").array().notNull().default([]),
  isPublic: boolean("is_public").notNull().default(false),
  forkedFrom: integer("forked_from"),
  viewsCount: integer("views_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Project Stars (likes) ─────────────────────────────────────────────────────
export const projectStarsTable = pgTable("project_stars", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => userProjectsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("project_stars_user_project_idx").on(table.userId, table.projectId),
]);

// ── Project Snapshots (Git-like versioning) ────────────────────────────────────
export const projectSnapshotsTable = pgTable("project_snapshots", {
  id:        serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => userProjectsTable.id, { onDelete: "cascade" }),
  userId:    integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  message:   text("message").notNull().default(""),
  files:     jsonb("files").$type<unknown[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── IDE Execution Audit Log ───────────────────────────────────────────────────
export const ideExecutionLogsTable = pgTable("ide_execution_logs", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  ip:          text("ip").notNull().default("unknown"),
  language:    text("language").notNull().default("unknown"),
  status:      text("status").notNull(),
  blockReason: text("block_reason"),
  codeSnippet: text("code_snippet"),
  durationMs:  integer("duration_ms"),
  exitCode:    integer("exit_code"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});
