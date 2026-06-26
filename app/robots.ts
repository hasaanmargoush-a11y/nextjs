import type { MetadataRoute } from "next";

interface SeoSettings {
  siteUrl?: string;
  robotsAllow?: string;
  robotsDisallow?: string;
  indexingEnabled?: boolean;
}

const API_BASE = process.env.INTERNAL_API_URL ?? "http://localhost:8080";

async function getSeoSettings(): Promise<SeoSettings> {
  try {
    const res = await fetch(`${API_BASE}/api/settings/seo`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getSeoSettings();

  const siteUrl = seo.siteUrl?.replace(/\/$/, "") || "https://nouvil.com";
  const indexing = seo.indexingEnabled !== false;

  const allow = (seo.robotsAllow || "/,/courses/,/articles/,/problems/,/tools,/leaderboard,/about,/contact,/learn/")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const disallow = (seo.robotsDisallow || "/admin/,/dashboard/,/my-courses/,/profile/,/auth/,/api/")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!indexing) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      sitemap: `${siteUrl}/sitemap.xml`,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow,
        disallow,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
