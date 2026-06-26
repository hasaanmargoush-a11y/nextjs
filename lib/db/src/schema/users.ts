import { pgTable, text, serial, integer, timestamp, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  avatar: text("avatar"),
  bio: text("bio"),
  phone: text("phone"),
  address: text("address"),
  age: integer("age"),
  facebook: text("facebook"),
  twitter: text("twitter"),
  linkedin: text("linkedin"),
  github: text("github"),
  points: integer("points").notNull().default(0),
  level: text("level").default("مبتدئ"),
  streak: integer("streak").notNull().default(0),
  maxStreak: integer("max_streak").notNull().default(0),
  lastSolvedAt: date("last_solved_at"),
  isActive: boolean("is_active").notNull().default(true),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationCode: text("verification_code"),
  codeExpiresAt: timestamp("code_expires_at"),
  pendingEmail: text("pending_email"),
  pendingPasswordHash: text("pending_password_hash"),
  pendingChangeCode: text("pending_change_code"),
  pendingCodeExpiresAt: timestamp("pending_code_expires_at"),
  pendingChangeType: text("pending_change_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
