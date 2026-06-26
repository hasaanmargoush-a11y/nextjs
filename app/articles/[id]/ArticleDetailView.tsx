"use client";

import { motion } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import {
  ArrowRight, Clock, Eye, Tag, Newspaper, Calendar, User,
} from "lucide-react";

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

export interface ArticleFull {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  authorName: string;
  readTime: number;
  views: number;
  tags: string[];
  isFeatured: boolean;
  thumbnail: string | null;
  featuredImageAlt: string | null;
  publishedAt: string | null;
  createdAt: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  focusKeyword: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  noFollow: boolean;
  wordCount: number;
}

function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={block.id} className="dark:text-slate-300 text-slate-700 leading-relaxed text-base">
                {block.text}
              </p>
            );
          case "heading":
            if (block.level === 1)
              return <h1 key={block.id} className="text-2xl sm:text-3xl font-black dark:text-white text-slate-900 mt-8 mb-3">{block.text}</h1>;
            if (block.level === 2)
              return <h2 key={block.id} className="text-xl sm:text-2xl font-bold dark:text-white text-slate-900 mt-6 mb-2 pb-2 border-b dark:border-white/10 border-slate-200">{block.text}</h2>;
            return <h3 key={block.id} className="text-lg sm:text-xl font-bold dark:text-slate-100 text-slate-800 mt-5 mb-2">{block.text}</h3>;
          case "image":
            return (
              <figure key={block.id} className="my-6">
                <img src={block.src || ""} alt={block.alt || ""} className="w-full rounded-xl object-cover max-h-[480px]" />
                {block.caption && (
                  <figcaption className="text-center text-sm dark:text-slate-500 text-slate-400 mt-2 italic">{block.caption}</figcaption>
                )}
              </figure>
            );
          case "code":
            return (
              <div key={block.id} className="my-4">
                <div className="flex items-center gap-2 px-4 py-2 dark:bg-[#0d1424] bg-slate-900 rounded-t-xl border-b dark:border-white/5 border-slate-700">
                  <span className="text-xs text-cyan-400 font-mono">{block.language || "code"}</span>
                  <div className="flex gap-1.5 mr-auto">
                    <span className="w-3 h-3 rounded-full bg-red-500/50" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <span className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                </div>
                <pre className="dark:bg-[#0d1424] bg-slate-900 rounded-b-xl p-4 overflow-x-auto text-sm leading-relaxed border dark:border-white/5 border-slate-700 border-t-0">
                  <code className="text-green-400 font-mono" dir="ltr">{block.code}</code>
                </pre>
              </div>
            );
          case "quote":
            return (
              <blockquote key={block.id} className="my-6 border-r-4 border-cyan-400 pr-5 dark:bg-cyan-500/5 bg-cyan-50 rounded-l-xl py-4 pl-4">
                <p className="text-lg italic dark:text-slate-200 text-slate-700 leading-relaxed">{block.text}</p>
                {block.author && (
                  <cite className="text-sm dark:text-slate-400 text-slate-500 mt-2 block not-italic">— {block.author}</cite>
                )}
              </blockquote>
            );
          case "divider":
            return <hr key={block.id} className="my-8 dark:border-white/10 border-slate-200" />;
          case "list": {
            const items = block.items || [];
            if (block.listStyle === "ordered") {
              return (
                <ol key={block.id} className="list-decimal list-inside space-y-2 dark:text-slate-300 text-slate-700 mr-4">
                  {items.map((item, i) => <li key={i} className="leading-relaxed">{item}</li>)}
                </ol>
              );
            }
            return (
              <ul key={block.id} className="space-y-2 dark:text-slate-300 text-slate-700 mr-4">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-cyan-400 mt-1.5 shrink-0">•</span>
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
              <div key={block.id} className="my-6 rounded-xl overflow-hidden">
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
            return (
              <p key={block.id}>
                <a href={block.linkUrl || "#"} target="_blank" rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline break-all">
                  {block.linkText || block.linkUrl}
                </a>
              </p>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

function ArticleContent({ content }: { content: string }) {
  try {
    const blocks = JSON.parse(content) as Block[];
    if (Array.isArray(blocks) && blocks.length > 0) return <BlockRenderer blocks={blocks} />;
  } catch { /* not JSON */ }
  return (
    <div
      className="dark:text-slate-300 text-slate-700 leading-relaxed prose prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content, { USE_PROFILES: { html: true } }) }}
    />
  );
}

export default function ArticleDetailView({ article }: { article: ArticleFull }) {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });

  const displayDate = article.publishedAt || article.createdAt;

  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 py-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-2 mb-4 text-sm">
                <Link href="/articles" className="flex items-center gap-1.5 dark:text-slate-400 text-slate-600 hover:text-cyan-400 transition-colors">
                  <ArrowRight className="w-4 h-4" />
                  المقالات
                </Link>
                <span className="dark:text-slate-600 text-slate-300">/</span>
                <span className="dark:text-slate-400 text-slate-600 line-clamp-1">{article.category}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="badge badge-cyan">{article.category}</span>
                {article.isFeatured && <span className="badge badge-orange">⭐ مميز</span>}
              </div>

              <h1 className="text-3xl sm:text-4xl font-black dark:text-white text-slate-900 leading-tight mb-4">
                {article.title}
              </h1>

              <p className="dark:text-slate-400 text-slate-600 text-lg leading-relaxed mb-6">
                {article.excerpt}
              </p>

              <div className="flex flex-wrap items-center gap-5 dark:text-slate-500 text-slate-400 text-sm">
                <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-cyan-400" />{article.authorName}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-cyan-400" />{formatDate(displayDate)}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-cyan-400" />{article.readTime} دقائق قراءة</span>
                <span className="flex items-center gap-1.5"><Eye className="w-4 h-4 text-cyan-400" />{article.views.toLocaleString("ar-EG")} مشاهدة</span>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {article.thumbnail && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <img
                src={article.thumbnail}
                alt={article.featuredImageAlt || article.title}
                className="w-full h-64 sm:h-80 object-cover rounded-2xl"
              />
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 sm:p-8 mb-8"
          >
            {article.content ? (
              <ArticleContent content={article.content} />
            ) : (
              <div className="text-center py-10">
                <Newspaper className="w-12 h-12 dark:text-slate-700 text-slate-300 mx-auto mb-3" />
                <p className="dark:text-slate-400 text-slate-600">محتوى المقال قيد الإضافة</p>
              </div>
            )}
          </motion.div>

          {article.tags && article.tags.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap gap-2 mb-8"
            >
              {article.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 text-sm dark:text-slate-400 text-slate-600">
                  <Tag className="w-3 h-3" /> {tag}
                </span>
              ))}
            </motion.div>
          )}

          <div className="flex justify-center">
            <Link href="/articles" className="btn-secondary inline-flex">
              <ArrowRight className="w-4 h-4" />
              العودة للمقالات
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
