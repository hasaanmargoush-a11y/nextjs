import { pgTable, text, serial, integer, timestamp, boolean, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { problemsTable } from "./problems";

// ─── Tracks (مسارات) ─────────────────────────────────────────────────────────
export const tracksTable = pgTable("tracks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  language: text("language").notNull().default("Python"),
  difficulty: text("difficulty").notNull().default("beginner"),
  icon: text("icon").notNull().default("🐍"),
  color: text("color").notNull().default("#06b6d4"),
  order: integer("order").notNull().default(0),
  totalProblems: integer("total_problems").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Packs (حزم داخل كل مسار) ────────────────────────────────────────────────
export const packsTable = pgTable("packs", {
  id: serial("id").primaryKey(),
  trackId: integer("track_id").notNull().references(() => tracksTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  order: integer("order").notNull().default(0),
  totalProblems: integer("total_problems").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── User Track Progress ──────────────────────────────────────────────────────
export const userTrackProgressTable = pgTable("user_track_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  trackId: integer("track_id").notNull().references(() => tracksTable.id, { onDelete: "cascade" }),
  packId: integer("pack_id").references(() => packsTable.id, { onDelete: "cascade" }),
  solvedCount: integer("solved_count").notNull().default(0),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// ─── Badges (أوسمة) ──────────────────────────────────────────────────────────
export const badgesTable = pgTable("badges", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("🏆"),
  color: text("color").notNull().default("#f59e0b"),
  condition: text("condition").notNull(),
  conditionValue: integer("condition_value").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── User Badges ──────────────────────────────────────────────────────────────
export const userBadgesTable = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  badgeId: integer("badge_id").notNull().references(() => badgesTable.id, { onDelete: "cascade" }),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
});

// ─── Daily Challenges (التحدي اليومي) ────────────────────────────────────────
export const dailyChallengesTable = pgTable("daily_challenges", {
  id: serial("id").primaryKey(),
  problemId: integer("problem_id").notNull().references(() => problemsTable.id),
  challengeDate: date("challenge_date").notNull().unique(),
  bonusMultiplier: integer("bonus_multiplier").notNull().default(2),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── User Daily Challenges ────────────────────────────────────────────────────
export const userDailyChallengesTable = pgTable("user_daily_challenges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  dailyChallengeId: integer("daily_challenge_id").notNull().references(() => dailyChallengesTable.id),
  solvedAt: timestamp("solved_at").notNull().defaultNow(),
});

// ─── Problem Solutions (مشاركة الحلول) ───────────────────────────────────────
export const problemSolutionsTable = pgTable("problem_solutions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  problemId: integer("problem_id").notNull().references(() => problemsTable.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  language: text("language").notNull(),
  description: text("description"),
  executionTime: integer("execution_time"),
  upvotes: integer("upvotes").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Solution Votes ───────────────────────────────────────────────────────────
export const solutionVotesTable = pgTable("solution_votes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  solutionId: integer("solution_id").notNull().references(() => problemSolutionsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Duels (وضع المبارزة) ─────────────────────────────────────────────────────
export const duelsTable = pgTable("duels", {
  id: serial("id").primaryKey(),
  challengerId: integer("challenger_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  challengedId: integer("challenged_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  problemId: integer("problem_id").notNull().references(() => problemsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending | accepted | rejected | active | finished | cancelled
  winnerId: integer("winner_id").references(() => usersTable.id),
  challengerCode: text("challenger_code"),
  challengedCode: text("challenged_code"),
  challengerSolvedAt: timestamp("challenger_solved_at"),
  challengedSolvedAt: timestamp("challenged_solved_at"),
  challengerLang: text("challenger_lang").notNull().default("python"),
  challengedLang: text("challenged_lang").notNull().default("python"),
  challengerProgress: integer("challenger_progress").notNull().default(0), // % test cases passed
  challengedProgress: integer("challenged_progress").notNull().default(0),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  expiresAt: timestamp("expires_at"), // invitation expiry
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Tags on Problems (stored in problems.tags jsonb, but typed here) ─────────
export const PROBLEM_TAGS = [
  "arrays", "strings", "loops", "recursion", "sorting", "searching",
  "hash-map", "linked-list", "stack", "queue", "tree", "graph",
  "dynamic-programming", "greedy", "math", "bit-manipulation",
  "two-pointers", "sliding-window", "binary-search", "backtracking",
] as const;

export const COMPANY_TAGS = [
  "Google", "Meta", "Amazon", "Microsoft", "Apple",
  "Netflix", "Uber", "Airbnb", "Twitter", "LinkedIn",
] as const;

// ─── Schemas & Types ──────────────────────────────────────────────────────────
export const insertTrackSchema = createInsertSchema(tracksTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPackSchema = createInsertSchema(packsTable).omit({ id: true, createdAt: true });
export const insertBadgeSchema = createInsertSchema(badgesTable).omit({ id: true, createdAt: true });
export const insertDailyChallengeSchema = createInsertSchema(dailyChallengesTable).omit({ id: true, createdAt: true });
export const insertProblemSolutionSchema = createInsertSchema(problemSolutionsTable).omit({ id: true, createdAt: true });

export type Track = typeof tracksTable.$inferSelect;
export type Pack = typeof packsTable.$inferSelect;
export type Badge = typeof badgesTable.$inferSelect;
export type DailyChallenge = typeof dailyChallengesTable.$inferSelect;
export type ProblemSolution = typeof problemSolutionsTable.$inferSelect;
export type UserBadge = typeof userBadgesTable.$inferSelect;
export type InsertTrack = z.infer<typeof insertTrackSchema>;
export type InsertPack = z.infer<typeof insertPackSchema>;
