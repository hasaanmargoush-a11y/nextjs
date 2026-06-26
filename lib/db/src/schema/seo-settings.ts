import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const seoSettingsTable = pgTable("seo_settings", {
  id:                  serial("id").primaryKey(),
  siteName:            text("site_name").notNull().default("نوفيل | منصة تعليم البرمجة"),
  siteUrl:             text("site_url").notNull().default("https://nouvil.com"),
  defaultDescription:  text("default_description").notNull().default("تعلم البرمجة بالعربي مع نوفيل"),
  defaultOgImage:      text("default_og_image"),
  googleVerification:  text("google_verification"),
  bingVerification:    text("bing_verification"),
  googleAnalyticsId:   text("google_analytics_id"),
  robotsDisallow:      text("robots_disallow").notNull().default("/admin/,/dashboard/,/api/,/auth/"),
  robotsAllow:         text("robots_allow").notNull().default("/,/courses/,/articles/,/problems/"),
  indexingEnabled:     boolean("indexing_enabled").notNull().default(true),
  updatedAt:           timestamp("updated_at").notNull().defaultNow(),
});

export type SeoSettings = typeof seoSettingsTable.$inferSelect;
