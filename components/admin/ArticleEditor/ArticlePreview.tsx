"use client";

import { useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Eye, User, Calendar, Tag, Newspaper,
  Globe, Share2, Twitter, Search, AlertCircle,
  CheckCircle, AlertTriangle, ExternalLink, ChevronRight, Code2, Copy, Check,
} from "lucide-react";
import { analyzeSeo } from "@/lib/seo-analyzer";

// ── Block types ───────────────────────────────────────────────────────────
interface Block {
  id: string;
  type: string;
  text?: string;
  level?: 1 | 2 | 3;
  src?: string;
  alt?: string;
  caption?: string;
  language?: string;
  code?: string;
  author?: string;
  listStyle?: "ordered" | "unordered";
  items?: string[];
  videoUrl?: string;
  linkUrl?: string;
  linkText?: string;
}

// ── Block renderer ─────────────────────────────────────────────────────────
function BlockRenderer({ blocks }: { blocks: Block[] }) {
  if (blocks.length === 0)
    return (
      <div className="text-center py-12">
        <Newspaper className="w-10 h-10 dark:text-slate-700 text-slate-300 mx-auto mb-3" />
        <p className="dark:text-slate-500 text-slate-400 text-sm">ابدأ بإضافة بلوكات لترى المعاينة هنا</p>
      </div>
    );

  return (
    <div className="space-y-5">
      {blocks.map((block) => {
        switch (block.type) {
          case "paragraph":
            if (!block.text) return null;
            return (
              <p key={block.id} className="dark:text-slate-300 text-slate-700 leading-[1.9] text-[15px]">
                {block.text}
              </p>
            );
          case "heading":
            if (!block.text) return null;
            if (block.level === 1)
              return <h1 key={block.id} className="text-2xl sm:text-3xl font-black dark:text-white text-slate-900 mt-8 mb-3">{block.text}</h1>;
            if (block.level === 2)
              return (
                <h2 key={block.id} className="text-xl sm:text-2xl font-bold dark:text-white text-slate-900 mt-6 mb-2 pb-2 border-b dark:border-white/10 border-slate-200">
                  {block.text}
                </h2>
              );
            return <h3 key={block.id} className="text-lg font-bold dark:text-slate-100 text-slate-800 mt-5 mb-2">{block.text}</h3>;

          case "image":
            if (!block.src) return (
              <div key={block.id} className="w-full h-40 rounded-xl dark:bg-white/5 bg-slate-100 border-2 border-dashed dark:border-white/10 border-slate-200 flex items-center justify-center dark:text-slate-600 text-slate-400 text-sm">
                الصورة ستظهر هنا
              </div>
            );
            return (
              <figure key={block.id} className="my-4">
                <img src={block.src} alt={block.alt || ""} className="w-full rounded-xl object-cover max-h-[380px]" />
                {block.caption && (
                  <figcaption className="text-center text-xs dark:text-slate-500 text-slate-400 mt-2 italic">{block.caption}</figcaption>
                )}
              </figure>
            );

          case "code":
            return (
              <div key={block.id} className="my-3">
                <div className="flex items-center gap-2 px-3 py-1.5 dark:bg-[#0d1424] bg-slate-900 rounded-t-xl border-b dark:border-white/5 border-slate-700">
                  <span className="text-xs text-cyan-400 font-mono">{block.language || "code"}</span>
                  <div className="flex gap-1.5 mr-auto">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  </div>
                </div>
                <pre className="dark:bg-[#0d1424] bg-slate-900 rounded-b-xl p-4 overflow-x-auto text-sm leading-relaxed border dark:border-white/5 border-slate-700 border-t-0">
                  <code className="text-green-400 font-mono whitespace-pre-wrap" dir="ltr">{block.code || "// ..."}</code>
                </pre>
              </div>
            );

          case "quote":
            return (
              <blockquote key={block.id} className="my-4 border-r-4 border-cyan-400 pr-4 dark:bg-cyan-500/5 bg-cyan-50 rounded-l-xl py-3 pl-4">
                <p className="italic dark:text-slate-200 text-slate-700 leading-relaxed">{block.text || "..."}</p>
                {block.author && (
                  <cite className="text-sm dark:text-slate-400 text-slate-500 mt-1.5 block not-italic">— {block.author}</cite>
                )}
              </blockquote>
            );

          case "divider":
            return <hr key={block.id} className="my-6 dark:border-white/10 border-slate-200" />;

          case "list": {
            const items = (block.items || []).filter(Boolean);
            if (!items.length) return null;
            if (block.listStyle === "ordered") {
              return (
                <ol key={block.id} className="list-decimal list-inside space-y-1.5 dark:text-slate-300 text-slate-700 mr-4">
                  {items.map((item, i) => <li key={i}>{item}</li>)}
                </ol>
              );
            }
            return (
              <ul key={block.id} className="space-y-1.5 dark:text-slate-300 text-slate-700 mr-4">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-1 shrink-0 text-xs">●</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );
          }

          case "video": {
            if (!block.videoUrl) return null;
            const isYt = block.videoUrl.includes("youtube.com") || block.videoUrl.includes("youtu.be");
            return (
              <div key={block.id} className="my-4 rounded-xl overflow-hidden">
                {isYt ? (
                  <iframe
                    src={block.videoUrl.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                    className="w-full aspect-video"
                    allowFullScreen
                  />
                ) : (
                  <video src={block.videoUrl} controls className="w-full rounded-xl" />
                )}
              </div>
            );
          }

          case "link":
            if (!block.linkUrl) return null;
            return (
              <p key={block.id}>
                <span className="text-cyan-400 hover:underline cursor-pointer break-all">
                  {block.linkText || block.linkUrl}
                </span>
              </p>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

// ── Google SERP Preview ───────────────────────────────────────────────────
function GooglePreview({ title, description, slug, category }: {
  title: string;
  description: string;
  slug: string;
  category: string;
}) {
  const displayTitle = title || "عنوان المقال";
  const displayDesc = description || "الوصف الذي سيظهر في نتائج Google سيكون هنا...";
  const urlSlug = slug || title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40) || "article-slug";

  const titleLen = title.length;
  const descLen = description.length;
  const titleOk = titleLen >= 30 && titleLen <= 60;
  const descOk = descLen >= 120 && descLen <= 160;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border dark:border-white/10 border-slate-200 overflow-hidden dark:bg-white bg-white shadow-md">
        <div className="bg-[#f8f9fa] px-3 py-2 border-b border-slate-200 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <div className="flex-1 mx-2 bg-white rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-500 font-mono truncate" dir="ltr">
            google.com/search?q={(title || "search").replace(/\s+/g, "+")}
          </div>
        </div>

        <div className="p-4 bg-white" dir="ltr">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-white text-[8px] font-bold">N</div>
            <div>
              <p className="text-xs text-slate-800 font-medium leading-none">Nouvil</p>
              <p className="text-[10px] text-slate-500 leading-none">nouvil.com › articles › {urlSlug}</p>
            </div>
          </div>
          <h3 className="text-[#1a0dab] text-lg font-normal leading-tight hover:underline cursor-pointer mb-1 line-clamp-2">
            {displayTitle}
          </h3>
          <p className="text-[#4d5156] text-sm leading-snug line-clamp-3">{displayDesc}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className={`flex items-center gap-1.5 p-2 rounded-lg border ${titleOk ? "dark:border-green-500/20 border-green-200 dark:bg-green-500/5 bg-green-50" : "dark:border-amber-500/20 border-amber-200 dark:bg-amber-500/5 bg-amber-50"}`}>
          {titleOk
            ? <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
            : <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0" />}
          <div>
            <p className={`font-medium ${titleOk ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>العنوان</p>
            <p className="dark:text-slate-400 text-slate-500">{titleLen}/60 حرف</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 p-2 rounded-lg border ${descOk ? "dark:border-green-500/20 border-green-200 dark:bg-green-500/5 bg-green-50" : "dark:border-amber-500/20 border-amber-200 dark:bg-amber-500/5 bg-amber-50"}`}>
          {descOk
            ? <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
            : <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0" />}
          <div>
            <p className={`font-medium ${descOk ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>الوصف</p>
            <p className="dark:text-slate-400 text-slate-500">{descLen}/160 حرف</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Facebook / OG Card Preview ────────────────────────────────────────────
function OgCardPreview({ title, description, image, thumbnail, slug }: {
  title: string;
  description: string;
  image: string;
  thumbnail: string;
  slug: string;
}) {
  const displayTitle = title || "عنوان المقال";
  const displayDesc = description || "الوصف الذي سيظهر عند المشاركة على Facebook وLinkedIn...";
  const displayImage = image || thumbnail;
  const urlSlug = slug || "article-slug";

  return (
    <div className="rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden shadow-sm" dir="ltr">
      {displayImage ? (
        <img
          src={displayImage}
          alt="OG"
          className="w-full h-32 object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className="w-full h-32 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center border-b dark:border-white/10 border-slate-200">
          <Share2 className="w-8 h-8 dark:text-slate-600 text-slate-300" />
        </div>
      )}
      <div className="p-3 dark:bg-[#1c1e21] bg-[#f0f2f5]">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">NOUVIL.COM</p>
        <p className="text-sm font-semibold dark:text-white text-slate-900 leading-tight line-clamp-2">{displayTitle}</p>
        <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5 line-clamp-2">{displayDesc}</p>
        <p className="text-[10px] text-slate-400 mt-1 truncate">nouvil.com/articles/{urlSlug}</p>
      </div>
    </div>
  );
}

// ── Twitter Card Preview ──────────────────────────────────────────────────
function TwitterCardPreview({ title, description, image, thumbnail, slug }: {
  title: string;
  description: string;
  image: string;
  thumbnail: string;
  slug: string;
}) {
  const displayTitle = title || "عنوان المقال";
  const displayDesc = description || "الوصف الذي سيظهر على Twitter/X...";
  const displayImage = image || thumbnail;

  return (
    <div className="rounded-2xl border dark:border-slate-700 border-slate-200 overflow-hidden shadow-sm" dir="ltr">
      {displayImage ? (
        <img
          src={displayImage}
          alt="Twitter"
          className="w-full h-28 object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className="w-full h-28 bg-gradient-to-br from-sky-500/20 to-blue-500/20 flex items-center justify-center">
          <Twitter className="w-7 h-7 dark:text-slate-600 text-slate-300" />
        </div>
      )}
      <div className="p-3 dark:bg-[#16202d] bg-white">
        <p className="text-sm font-bold dark:text-white text-slate-900 leading-tight line-clamp-2">{displayTitle}</p>
        <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5 line-clamp-2">{displayDesc}</p>
        <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
          <Globe className="w-3 h-3" /> nouvil.com
        </p>
      </div>
    </div>
  );
}

// ── SEO Score Mini ─────────────────────────────────────────────────────────
function SeoScoreMini({ form }: {
  form: {
    title: string; metaTitle: string; metaDescription: string;
    focusKeyword: string; content: string; slug: string;
    thumbnail?: string; featuredImageAlt?: string; tags?: string[];
    excerpt?: string; authorName?: string;
    ogTitle?: string; ogDescription?: string; ogImage?: string;
    twitterTitle?: string; twitterDescription?: string; twitterImage?: string;
    canonicalUrl?: string; noIndex?: boolean; noFollow?: boolean;
    metaKeywords?: string;
  };
}) {
  const result = analyzeSeo({
    title: form.title,
    slug: form.slug,
    excerpt: form.excerpt ?? "",
    content: form.content,
    category: "",
    focusKeyword: form.focusKeyword,
    metaTitle: form.metaTitle,
    metaDescription: form.metaDescription,
    metaKeywords: form.metaKeywords ?? "",
    canonicalUrl: form.canonicalUrl ?? "",
    ogTitle: form.ogTitle ?? "",
    ogDescription: form.ogDescription ?? "",
    ogImage: form.ogImage ?? "",
    twitterTitle: form.twitterTitle ?? "",
    twitterDescription: form.twitterDescription ?? "",
    twitterImage: "",
    noIndex: form.noIndex ?? false,
    noFollow: form.noFollow ?? false,
    thumbnail: form.thumbnail ?? "",
    featuredImageAlt: form.featuredImageAlt ?? "",
    tags: form.tags ?? [],
    authorName: form.authorName ?? "",
  });

  const score = result.score;
  const prob = result.successProbability;
  const scoreColor = score >= 85 ? "text-green-400" : score >= 65 ? "text-cyan-400" : score >= 40 ? "text-amber-400" : "text-red-400";
  const scoreBg = score >= 85 ? "bg-green-500" : score >= 65 ? "bg-cyan-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";
  const topIssues = result.checks.filter(c => c.status === "fail" && c.category !== "optional").slice(0, 4);

  return (
    <div className="rounded-xl border dark:border-white/10 border-slate-200 p-3 dark:bg-[#111827] bg-slate-50 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold dark:text-white text-slate-900">نتيجة SEO</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] dark:text-slate-500 text-slate-400">فرصة: <span className={score >= 65 ? "text-green-400" : "text-amber-400"}>{prob}%</span></span>
          <span className={`text-lg font-black ${scoreColor}`}>{score}%</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full dark:bg-white/10 bg-slate-200 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${scoreBg}`} style={{ width: `${score}%` }} />
      </div>
      <div className="flex items-center gap-3 text-[10px]">
        <span className="flex items-center gap-1 text-green-400"><CheckCircle className="w-3 h-3" /> {result.passCount}</span>
        <span className="flex items-center gap-1 text-amber-400"><AlertTriangle className="w-3 h-3" /> {result.warnCount}</span>
        <span className="flex items-center gap-1 text-red-400"><AlertCircle className="w-3 h-3" /> {result.failCount}</span>
        <span className="text-[10px] dark:text-slate-500 text-slate-400 mr-auto">
          {score >= 85 ? "ممتاز" : score >= 65 ? "جيد" : score >= 40 ? "يحتاج تحسين" : "ضعيف"}
        </span>
      </div>
      {topIssues.length > 0 && (
        <div className="space-y-1 border-t dark:border-white/5 border-slate-100 pt-2">
          {topIssues.map((c, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="dark:text-slate-400 text-slate-500 leading-tight">{c.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── JSON-LD Structured Data ───────────────────────────────────────────────
interface JsonLdData {
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  authorName: string;
  thumbnail: string;
  ogImage: string;
  publishedAt?: string;
  tags: string[];
  category: string;
  slug: string;
  focusKeyword: string;
  wordCount: number;
}

function buildJsonLd(d: JsonLdData) {
  const url = `https://nouvil.com/articles/${d.slug || "article-slug"}`;
  const image = d.ogImage || d.thumbnail;
  const headline = d.metaTitle || d.title;
  const description = d.metaDescription || d.excerpt;
  const keywords = [
    ...(d.focusKeyword ? [d.focusKeyword] : []),
    ...(d.tags || []),
    ...(d.category ? [d.category] : []),
  ].filter(Boolean).join(", ");

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: headline || undefined,
    description: description || undefined,
    ...(image ? { image: { "@type": "ImageObject", url: image } } : {}),
    author: {
      "@type": "Person",
      name: d.authorName || "فريق نوفيل",
      url: "https://nouvil.com",
    },
    publisher: {
      "@type": "Organization",
      name: "Nouvil — نوفيل",
      logo: {
        "@type": "ImageObject",
        url: "https://nouvil.com/logo.png",
      },
    },
    datePublished: d.publishedAt || new Date().toISOString(),
    dateModified: new Date().toISOString(),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    ...(keywords ? { keywords } : {}),
    ...(d.category ? { articleSection: d.category } : {}),
    inLanguage: "ar",
    ...(d.wordCount > 0 ? { wordCount: d.wordCount } : {}),
  };
}

function colorizeJsonLd(json: string): React.ReactNode[] {
  const lines = json.split("\n");
  return lines.map((line, i) => {
    const parts: React.ReactNode[] = [];
    let rest = line;

    const keyMatch = rest.match(/^(\s*)("[\w@]+")(\s*:\s*)(.*)/);
    if (keyMatch) {
      parts.push(<span key="indent">{keyMatch[1]}</span>);
      parts.push(<span key="key" className="text-cyan-300">{keyMatch[2]}</span>);
      parts.push(<span key="colon" className="text-slate-400">{keyMatch[3]}</span>);
      const val = keyMatch[4];
      if (val.startsWith('"')) {
        parts.push(<span key="val" className="text-amber-300">{val}</span>);
      } else if (val === "{" || val === "[" || val === "}," || val === "]," || val === "{," || val === "}" || val === "]") {
        parts.push(<span key="val" className="text-slate-300">{val}</span>);
      } else if (!isNaN(Number(val.replace(/,$/, "")))) {
        parts.push(<span key="val" className="text-violet-300">{val}</span>);
      } else {
        parts.push(<span key="val" className="text-slate-300">{val}</span>);
      }
    } else {
      parts.push(<span key="plain" className="text-slate-400">{rest}</span>);
    }
    return <div key={i}>{parts}</div>;
  });
}

function JsonLdPreview({ data }: { data: JsonLdData }) {
  const [copied, setCopied] = useState(false);
  const schema = buildJsonLd(data);
  const json = JSON.stringify(schema, null, 2);

  const missingFields: string[] = [];
  if (!data.title && !data.metaTitle) missingFields.push("headline (العنوان)");
  if (!data.metaDescription && !data.excerpt) missingFields.push("description (الوصف)");
  if (!data.thumbnail && !data.ogImage) missingFields.push("image (الصورة)");
  if (!data.publishedAt) missingFields.push("datePublished (تاريخ النشر)");

  const handleCopy = () => {
    const script = `<script type="application/ld+json">\n${json}\n</script>`;
    navigator.clipboard.writeText(script).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-3">
      {/* Rich snippet simulation */}
      <div className="rounded-xl border dark:border-white/10 border-slate-200 overflow-hidden dark:bg-white bg-white shadow-sm">
        <div className="bg-[#f8f9fa] px-3 py-1.5 border-b border-slate-200 flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <span className="text-[10px] text-slate-400 mr-2">Rich Snippet — نتيجة بحث منسّقة</span>
        </div>
        <div className="p-4 bg-white" dir="ltr">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-white text-[8px] font-bold shrink-0">N</div>
            <div>
              <p className="text-xs text-slate-800 font-medium leading-none">Nouvil — نوفيل</p>
              <p className="text-[10px] text-slate-400 leading-none">nouvil.com › articles › {data.slug || "article-slug"}</p>
            </div>
            <div className="mr-auto text-[10px] text-slate-400 text-left">
              <span>{data.publishedAt ? new Date(data.publishedAt).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB")}</span>
            </div>
          </div>
          <h3 className="text-[#1a0dab] text-base font-normal leading-tight line-clamp-2 mt-1">
            {data.metaTitle || data.title || <span className="text-slate-400 italic">headline missing…</span>}
          </h3>
          <p className="text-[#4d5156] text-xs leading-snug line-clamp-2 mt-0.5">
            {data.metaDescription || data.excerpt || <span className="italic">description missing…</span>}
          </p>
          {/* Author + date breadcrumb (rich snippet style) */}
          <p className="text-[10px] text-[#4d5156] mt-1.5">
            By <span className="font-medium">{data.authorName || "Nouvil Team"}</span>
            {data.publishedAt && (
              <> · {new Date(data.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</>
            )}
          </p>
        </div>
      </div>

      {/* Missing fields warning */}
      {missingFields.length > 0 && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg dark:bg-amber-500/10 bg-amber-50 border dark:border-amber-500/20 border-amber-200">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">حقول ناقصة في الـ Schema:</p>
            <ul className="space-y-0.5">
              {missingFields.map((f) => (
                <li key={f} className="text-[11px] text-amber-600 dark:text-amber-400">• {f}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* JSON-LD Code block */}
      <div className="rounded-xl border dark:border-white/10 border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 dark:bg-[#0d1424] bg-slate-900 border-b dark:border-white/5 border-slate-700">
          <div className="flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-cyan-400 font-mono font-semibold">JSON-LD · application/ld+json</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded-md dark:bg-white/5 bg-slate-800 hover:dark:bg-white/10 hover:bg-slate-700 transition-colors text-[11px] dark:text-slate-300 text-slate-300"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? "تم النسخ!" : "نسخ"}
          </button>
        </div>
        <pre className="dark:bg-[#070b14] bg-slate-950 p-3 overflow-x-auto text-[11px] leading-relaxed font-mono max-h-64 overflow-y-auto" dir="ltr">
          {colorizeJsonLd(json)}
        </pre>
      </div>

      <p className="text-[11px] dark:text-slate-500 text-slate-400 text-center" dir="rtl">
        يُضاف هذا الكود تلقائياً في صفحة المقال · يساعد Google على فهم محتوى المقال وعرض نتائج منسّقة (Rich Results)
      </p>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────
interface ArticlePreviewProps {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  authorName: string;
  tags: string[];
  thumbnail: string;
  slug: string;
  publishedAt?: string;
  isFeatured?: boolean;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
}

type PreviewTab = "article" | "seo";

export default function ArticlePreview(props: ArticlePreviewProps) {
  const {
    title, excerpt, content, category, authorName, tags, thumbnail,
    slug, publishedAt, isFeatured,
    metaTitle, metaDescription, focusKeyword,
    ogTitle, ogDescription, ogImage,
    twitterTitle, twitterDescription, twitterImage,
  } = props;

  const [tab, setTab] = useState<PreviewTab>("article");

  let blocks: Block[] = [];
  let isHtml = false;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) blocks = parsed as Block[];
    else isHtml = true;
  } catch {
    isHtml = !!content;
  }

  const wordCount = blocks.reduce((sum, b) => {
    const t = b.text || b.code || (b.items || []).join(" ") || "";
    return sum + t.split(/\s+/).filter(Boolean).length;
  }, 0);
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const formatDate = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
      : new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });

  const displaySlug =
    slug ||
    title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\u0600-\u06FF-]/g, "").slice(0, 50) ||
    "article-slug";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-1 px-3 pt-2 pb-0 border-b dark:border-white/10 border-slate-200 shrink-0">
        <button
          onClick={() => setTab("article")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-all -mb-px ${
            tab === "article"
              ? "border-violet-500 text-violet-400 dark:bg-violet-500/5"
              : "border-transparent dark:text-slate-500 text-slate-400 hover:text-violet-400"
          }`}
        >
          <Newspaper className="w-3.5 h-3.5" />
          معاينة المقال
        </button>
        <button
          onClick={() => setTab("seo")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-all -mb-px ${
            tab === "seo"
              ? "border-cyan-500 text-cyan-400 dark:bg-cyan-500/5"
              : "border-transparent dark:text-slate-500 text-slate-400 hover:text-cyan-400"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          محركات البحث
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {tab === "article" ? (
            <motion.div key="article" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <div className="sticky top-0 z-10 dark:bg-[#0d1120] bg-slate-200 border-b dark:border-white/5 border-slate-300 px-3 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                </div>
                <div className="flex-1 dark:bg-white/5 bg-white rounded-md px-2 py-1 text-[10px] dark:text-slate-500 text-slate-400 font-mono truncate mr-2 border dark:border-white/5 border-slate-300 flex items-center gap-1" dir="ltr">
                  <span className="text-green-500">HTTPS</span>
                  nouvil.com/articles/{displaySlug}
                </div>
                <ExternalLink className="w-3 h-3 dark:text-slate-600 text-slate-400 shrink-0" />
              </div>

              <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 px-4 py-6">
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center gap-1.5 text-[11px] dark:text-slate-500 text-slate-400 mb-3" dir="rtl">
                    <span>المقالات</span>
                    <ChevronRight className="w-3 h-3 rotate-180" />
                    <span>{category || "التصنيف"}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3" dir="rtl">
                    {category && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {category}
                      </span>
                    )}
                    {isFeatured && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        ⭐ مميز
                      </span>
                    )}
                  </div>

                  <h1 className="text-xl sm:text-2xl font-black dark:text-white text-slate-900 leading-tight mb-2" dir="rtl">
                    {title || <span className="dark:text-slate-600 text-slate-300 italic">عنوان المقالة سيظهر هنا...</span>}
                  </h1>

                  <p className="dark:text-slate-400 text-slate-600 leading-relaxed mb-4 text-sm" dir="rtl">
                    {excerpt || <span className="italic dark:text-slate-600 text-slate-400">المقتطف سيظهر هنا...</span>}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] dark:text-slate-500 text-slate-400" dir="rtl">
                    <span className="flex items-center gap-1"><User className="w-3 h-3 text-cyan-400" /> {authorName || "الكاتب"}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-cyan-400" /> {formatDate(publishedAt)}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-cyan-400" /> {readTime} دقائق قراءة</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-cyan-400" /> 0 مشاهدة</span>
                  </div>
                </div>
              </div>

              <div className="max-w-2xl mx-auto px-4 py-5 space-y-4" dir="rtl">
                {thumbnail && (
                  <div className="mb-4">
                    <img src={thumbnail} alt={title} className="w-full h-44 object-cover rounded-xl" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
                  </div>
                )}

                <div className="dark:bg-[#111827] bg-white rounded-xl border dark:border-white/10 border-slate-200 p-5">
                  {isHtml && content ? (
                    <div className="dark:text-slate-300 text-slate-700 leading-relaxed text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content, { USE_PROFILES: { html: true } }) }} />
                  ) : (
                    <BlockRenderer blocks={blocks} />
                  )}
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {tags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-lg dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 text-[11px] dark:text-slate-400 text-slate-600">
                        <Tag className="w-2.5 h-2.5" /> {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div key="seo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="p-4 space-y-5" dir="rtl">
              <div>
                <p className="text-xs font-semibold dark:text-slate-300 text-slate-700 mb-2 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" /> معاينة Google
                </p>
                <GooglePreview
                  title={metaTitle || title}
                  description={metaDescription || excerpt}
                  slug={displaySlug}
                  category={category}
                />
              </div>

              <div>
                <p className="text-xs font-semibold dark:text-slate-300 text-slate-700 mb-2 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-orange-400" /> معاينة Facebook / LinkedIn
                </p>
                <OgCardPreview
                  title={ogTitle || title}
                  description={ogDescription || excerpt}
                  image={ogImage}
                  thumbnail={thumbnail}
                  slug={displaySlug}
                />
              </div>

              <div>
                <p className="text-xs font-semibold dark:text-slate-300 text-slate-700 mb-2 flex items-center gap-1.5">
                  <Twitter className="w-3.5 h-3.5 text-sky-400" /> معاينة Twitter / X
                </p>
                <TwitterCardPreview
                  title={twitterTitle || ogTitle || title}
                  description={twitterDescription || ogDescription || excerpt}
                  image={twitterImage || ogImage}
                  thumbnail={thumbnail}
                  slug={displaySlug}
                />
              </div>

              <SeoScoreMini
                form={{
                  title,
                  metaTitle,
                  metaDescription,
                  focusKeyword,
                  content,
                  slug: displaySlug,
                }}
              />

              <div>
                <p className="text-xs font-semibold dark:text-slate-300 text-slate-700 mb-2 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-violet-400" /> Structured Data · JSON-LD
                </p>
                <JsonLdPreview
                  data={{
                    title,
                    metaTitle,
                    metaDescription,
                    excerpt,
                    authorName,
                    thumbnail,
                    ogImage,
                    publishedAt: publishedAt || undefined,
                    tags,
                    category,
                    slug: displaySlug,
                    focusKeyword,
                    wordCount,
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
