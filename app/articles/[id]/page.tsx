import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleDetailView, { type ArticleFull } from "./ArticleDetailView";

// ── Internal server-side fetch (bypasses browser proxy) ───────────────────
async function fetchArticle(idOrSlug: string): Promise<ArticleFull | null> {
  try {
    const res = await fetch(`http://localhost:8080/api/articles/${encodeURIComponent(idOrSlug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<ArticleFull>;
  } catch {
    return null;
  }
}

// ── generateMetadata — runs server-side, injected into <head> ─────────────
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const article = await fetchArticle(id);

  if (!article) {
    return {
      title: "المقال غير موجود | نوفيل",
      description: "لم يتم العثور على المقال المطلوب.",
    };
  }

  const siteUrl = "https://nouvil.com";
  const articleUrl = `${siteUrl}/articles/${article.slug || article.id}`;
  const title = article.metaTitle || article.title;
  const description = article.metaDescription || article.excerpt;

  // Build dynamic OG image URL (fallback when no custom image set)
  const ogParams = new URLSearchParams({
    title: article.ogTitle ?? title,
    description: article.ogDescription ?? description,
    ...(article.category ? { category: article.category } : {}),
    author: article.authorName,
    ...(article.readTime ? { readTime: String(article.readTime) } : {}),
    type: "article",
  });
  const dynamicOgImage = `${siteUrl}/og?${ogParams.toString()}`;

  const image = article.ogImage || dynamicOgImage;
  const twitterImage = article.twitterImage || article.ogImage || dynamicOgImage;

  const robots: string[] = [];
  if (article.noIndex) robots.push("noindex");
  else robots.push("index");
  if (article.noFollow) robots.push("nofollow");
  else robots.push("follow");

  return {
    title,
    description,
    keywords: [
      ...(article.focusKeyword ? [article.focusKeyword] : []),
      ...(article.tags || []),
      ...(article.category ? [article.category] : []),
    ].filter(Boolean),
    authors: [{ name: article.authorName }],
    robots: robots.join(", "),
    ...(article.canonicalUrl ? { alternates: { canonical: article.canonicalUrl } } : {
      alternates: { canonical: articleUrl },
    }),
    openGraph: {
      type: "article",
      url: articleUrl,
      title: article.ogTitle ?? title,
      description: article.ogDescription ?? description,
      images: [{ url: image, width: 1200, height: 630, alt: article.title }],
      siteName: "نوفيل | منصة تعليم البرمجة",
      locale: "ar_EG",
      publishedTime: article.publishedAt || article.createdAt,
      modifiedTime: article.createdAt,
      authors: [article.authorName],
      section: article.category,
      tags: article.tags || [],
    },
    twitter: {
      card: "summary_large_image",
      title: article.twitterTitle ?? title,
      description: article.twitterDescription ?? description,
      images: [twitterImage],
      site: "@nouvil_ar",
    },
  };
}

// ── JSON-LD builder ────────────────────────────────────────────────────────
function buildJsonLd(article: ArticleFull) {
  const siteUrl = "https://nouvil.com";
  const articleUrl = `${siteUrl}/articles/${article.slug || article.id}`;
  const image = article.ogImage || article.thumbnail;
  const keywords = [
    ...(article.focusKeyword ? [article.focusKeyword] : []),
    ...(article.tags || []),
    ...(article.category ? [article.category] : []),
  ].filter(Boolean).join(", ");

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.metaTitle || article.title,
    description: article.metaDescription || article.excerpt,
    ...(image ? { image: { "@type": "ImageObject", url: image, width: 1200, height: 630 } } : {}),
    author: {
      "@type": "Person",
      name: article.authorName,
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Nouvil — نوفيل",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.png`,
        width: 512,
        height: 512,
      },
    },
    datePublished: article.publishedAt || article.createdAt,
    dateModified: article.createdAt,
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    url: articleUrl,
    ...(keywords ? { keywords } : {}),
    ...(article.category ? { articleSection: article.category } : {}),
    inLanguage: "ar",
    ...(article.wordCount > 0 ? { wordCount: article.wordCount } : {}),
    ...(article.readTime > 0 ? { timeRequired: `PT${article.readTime}M` } : {}),
  };
}

// ── BreadcrumbList JSON-LD ─────────────────────────────────────────────────
function buildBreadcrumbJsonLd(article: ArticleFull) {
  const siteUrl = "https://nouvil.com";
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "المقالات", item: `${siteUrl}/articles` },
      { "@type": "ListItem", position: 3, name: article.category, item: `${siteUrl}/articles?category=${encodeURIComponent(article.category)}` },
      { "@type": "ListItem", position: 4, name: article.title, item: `${siteUrl}/articles/${article.slug || article.id}` },
    ],
  };
}

// ── Page ──────────────────────────────────────────────────────────────────
export default async function ArticleDetailPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const article = await fetchArticle(id);

  if (!article) notFound();

  const jsonLd = buildJsonLd(article);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(article);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ArticleDetailView article={article} />
    </>
  );
}
