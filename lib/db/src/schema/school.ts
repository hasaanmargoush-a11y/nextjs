import { pgTable, text, serial, integer, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const schoolLanguagesTable = pgTable("school_languages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  icon: text("icon"),
  color: text("color").notNull().default("#3b82f6"),
  description: text("description"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  order: integer("order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [index("school_languages_slug_idx").on(t.slug)]);

export const schoolChaptersTable = pgTable("school_chapters", {
  id: serial("id").primaryKey(),
  languageId: integer("language_id").notNull().references(() => schoolLanguagesTable.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  titleAr: text("title_ar").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("school_chapters_language_idx").on(t.languageId)]);

export const schoolTopicsTable = pgTable("school_topics", {
  id: serial("id").primaryKey(),
  languageId: integer("language_id").notNull().references(() => schoolLanguagesTable.id, { onDelete: "cascade" }),
  chapterId: integer("chapter_id").references(() => schoolChaptersTable.id, { onDelete: "set null" }),
  slug: text("slug").notNull().unique(),
  titleAr: text("title_ar").notNull(),
  conceptExplanationAr: text("concept_explanation_ar").notNull().default(""),
  syntaxCode: text("syntax_code"),
  codeExamples: jsonb("code_examples").$type<Array<{ title: string; code: string; language: string }>>().notNull().default([]),
  proTipsAr: text("pro_tips_ar"),
  referenceTableJson: jsonb("reference_table_json").$type<{ headers: string[]; rows: string[][] } | null>(),
  seoKeywords: text("seo_keywords").array().notNull().default([]),
  order: integer("order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("school_topics_slug_idx").on(t.slug),
  index("school_topics_language_idx").on(t.languageId),
  index("school_topics_chapter_idx").on(t.chapterId),
]);

export const insertSchoolLanguageSchema = createInsertSchema(schoolLanguagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSchoolChapterSchema = createInsertSchema(schoolChaptersTable).omit({ id: true, createdAt: true });
export const insertSchoolTopicSchema = createInsertSchema(schoolTopicsTable).omit({ id: true, createdAt: true, updatedAt: true });

export type SchoolLanguage = typeof schoolLanguagesTable.$inferSelect;
export type SchoolChapter = typeof schoolChaptersTable.$inferSelect;
export type SchoolTopic = typeof schoolTopicsTable.$inferSelect;
export type InsertSchoolLanguage = z.infer<typeof insertSchoolLanguageSchema>;
export type InsertSchoolChapter = z.infer<typeof insertSchoolChapterSchema>;
export type InsertSchoolTopic = z.infer<typeof insertSchoolTopicSchema>;
