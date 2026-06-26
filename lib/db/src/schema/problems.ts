import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const problemsTable = pgTable("problems", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  difficulty: text("difficulty").notNull().default("easy"),
  category: text("category").notNull(),
  language: text("language").notNull().default("Python"),
  points: integer("points").notNull().default(10),
  solvedCount: integer("solved_count").notNull().default(0),
  examples: jsonb("examples").notNull().default([]),
  constraints: text("constraints").array().notNull().default([]),
  starterCode: text("starter_code"),
  solution: text("solution"),
  testCases: jsonb("test_cases").notNull().default([]),
  hints: text("hints").array().notNull().default([]),
  tags: jsonb("tags").notNull().default([]),
  companyTags: jsonb("company_tags").notNull().default([]),
  packId: integer("pack_id"),
  orderInPack: integer("order_in_pack").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  problemId: integer("problem_id").notNull().references(() => problemsTable.id),
  code: text("code").notNull(),
  language: text("language").notNull(),
  status: text("status").notNull().default("pending"),
  output: text("output"),
  errorMessage: text("error_message"),
  executionTime: integer("execution_time"),
  memoryUsed: integer("memory_used"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const lessonProgressTable = pgTable("lesson_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  lessonId: integer("lesson_id").notNull(),
  courseId: integer("course_id").notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export const insertProblemSchema = createInsertSchema(problemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({ id: true, createdAt: true });

export type Problem = typeof problemsTable.$inferSelect;
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type Submission = typeof submissionsTable.$inferSelect;
export type LessonProgress = typeof lessonProgressTable.$inferSelect;
