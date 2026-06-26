import type { MetadataRoute } from "next";

interface ArticleItem {
  id: number;
  slug: string;
  publishedAt: string | null;
  createdAt: string;
}

interface CourseItem {
  id: number;
  createdAt: string;
  isPublished: boolean;
}

interface ProblemItem {
  id: number;
}

interface SchoolLang {
  slug: string;
  updatedAt?: string;
}

const API_BASE = process.env.INTERNAL_API_URL ?? "http://localhost:8080";

async function getSiteUrl(): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/api/settings/seo`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return "https://nouvil.com";
    const data = await res.json();
    return (data?.siteUrl as string | undefined)?.replace(/\/$/, "") || "https://nouvil.com";
  } catch {
    return "https://nouvil.com";
  }
}

async function fetchArticles(): Promise<ArticleItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/articles?limit=10000`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchCourses(): Promise<CourseItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/courses?limit=10000`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data?.courses ?? []);
    return list.filter((c: CourseItem) => c.isPublished !== false);
  } catch {
    return [];
  }
}

async function fetchProblems(): Promise<ProblemItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/problems?limit=10000`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchSchoolLangs(): Promise<SchoolLang[]> {
  try {
    const res = await fetch(`${API_BASE}/api/school/languages`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [siteUrl, articles, courses, problems, schoolLangs] = await Promise.all([
    getSiteUrl(),
    fetchArticles(),
    fetchCourses(),
    fetchProblems(),
    fetchSchoolLangs(),
  ]);

  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${siteUrl}/courses`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/articles`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/problems`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/tools`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/leaderboard`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${siteUrl}/learn`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const articlePages: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${siteUrl}/articles/${a.slug || a.id}`,
    lastModified: new Date(a.publishedAt ?? a.createdAt),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const coursePages: MetadataRoute.Sitemap = courses.map((c) => ({
    url: `${siteUrl}/courses/${c.id}`,
    lastModified: new Date(c.createdAt),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const problemPages: MetadataRoute.Sitemap = problems.map((p) => ({
    url: `${siteUrl}/problems/${p.id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const schoolPages: MetadataRoute.Sitemap = schoolLangs.map((l) => ({
    url: `${siteUrl}/learn/${l.slug}`,
    lastModified: l.updatedAt ? new Date(l.updatedAt) : now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...articlePages, ...coursePages, ...problemPages, ...schoolPages];
}
