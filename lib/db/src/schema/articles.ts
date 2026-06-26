import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const articlesTable = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug"),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull().default(""),
  contentFormat: text("content_format").notNull().default("html"),
  category: text("category").notNull(),
  authorId: integer("author_id").references(() => usersTable.id),
  authorName: text("author_name").notNull().default("فريق نوفيل"),
  readTime: integer("read_time").notNull().default(5),
  wordCount: integer("word_count").notNull().default(0),
  views: integer("views").notNull().default(0),
  tags: text("tags").array().notNull().default([]),
  isFeatured: boolean("is_featured").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(true),
  status: text("status").notNull().default("published"),
  publishedAt: timestamp("published_at"),
  scheduledAt: timestamp("scheduled_at"),
  thumbnail: text("thumbnail"),
  featuredImageAlt: text("featured_image_alt"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  focusKeyword: text("focus_keyword"),
  metaKeywords: text("meta_keywords").array().notNull().default([]),
  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  ogImage: text("og_image"),
  twitterTitle: text("twitter_title"),
  twitterDescription: text("twitter_description"),
  twitterImage: text("twitter_image"),
  canonicalUrl: text("canonical_url"),
  noIndex: boolean("no_index").notNull().default(false),
  noFollow: boolean("no_follow").notNull().default(false),
  schemaMarkup: jsonb("schema_markup"),
  commentsEnabled: boolean("comments_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertArticleSchema = createInsertSchema(articlesTable).omit({ id: true, createdAt: true, updatedAt: true });

export type Article = typeof articlesTable.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
