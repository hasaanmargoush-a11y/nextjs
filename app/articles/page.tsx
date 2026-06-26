"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { useRouteOverride } from "@/hooks/useRouteOverride";
import { BlockRenderer } from "@/components/page-builder/BlockRenderer";
import { api } from "@/lib/api";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Clock,
  Eye,
  Tag,
  TrendingUp,
  Newspaper,
  ChevronLeft,
} from "lucide-react";
import { ArticleCardSkeleton } from "@/components/ui/Skeleton";

const CATEGORIES = [
  "الكل",
  "Python",
  "JavaScript",
  "React",
  "تقنيات الويب",
  "DevOps",
  "الخوارزميات",
  "نصائح المبرمجين",
];

interface Article {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  authorName: string;
  readTime: number;
  views: number;
  tags: string[];
  isFeatured: boolean;
  isPublished: boolean;
  thumbnail: string | null;
  createdAt: string;
}

function ArticlesPageDefault() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("الكل");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category !== "الكل") params.set("category", category);
    setLoading(true);
    api.get<Article[]>(`/articles?${params.toString()}`)
      .then(setArticles)
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [search, category]);

  const featuredArticles = articles.filter((a) => a.isFeatured);
  const displayArticles = articles.filter(
    (a) => !(category === "الكل" && !search && a.isFeatured)
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="badge badge-cyan mb-4 inline-block">المقالات</span>
              <h1 className="section-title dark:text-white text-slate-900 mb-4">
                مقالات ونصائح تقنية
              </h1>
              <p className="dark:text-slate-400 text-slate-600 mb-8">
                أحدث المقالات التقنية بالعربي من خبراء البرمجة والتطوير
              </p>
              <div className="relative max-w-xl">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-400 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث في المقالات..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full py-3 pr-10 pl-4 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {loading ? (
            <>
              <div className="mb-12">
                <div className="grid md:grid-cols-2 gap-6 mb-10">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="rounded-2xl border dark:border-cyan-500/20 border-cyan-200 p-6 space-y-3 dark:bg-cyan-900/10 bg-cyan-50/50 animate-pulse">
                      <div className="h-5 w-20 rounded-full dark:bg-white/8 bg-slate-200 rounded" />
                      <div className="h-6 w-5/6 dark:bg-white/8 bg-slate-200 rounded" />
                      <div className="h-4 w-full dark:bg-white/8 bg-slate-200 rounded" />
                      <div className="h-4 w-4/5 dark:bg-white/8 bg-slate-200 rounded" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-9 w-20 rounded-xl animate-pulse dark:bg-white/5 bg-slate-200 flex-shrink-0" />
                ))}
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => (
                  <ArticleCardSkeleton key={i} />
                ))}
              </div>
            </>
          ) : (
            <>
              {!search && category === "الكل" && featuredArticles.length > 0 && (
                <div className="mb-12">
                  <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-xl font-bold dark:text-white text-slate-900">
                      مقالات مميزة
                    </h2>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    {featuredArticles.map((article, i) => (
                      <motion.div
                        key={article.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        whileHover={{ y: -3 }}
                      >
                        <Link href={`/articles/${article.slug || article.id}`}>
                          <div className="dark:bg-gradient-to-br dark:from-cyan-900/20 dark:to-violet-900/20 bg-gradient-to-br from-cyan-50 to-violet-50 rounded-2xl border dark:border-cyan-500/20 border-cyan-200 p-6 hover:shadow-xl hover:shadow-cyan-500/10 transition-all group h-full">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="badge badge-cyan text-xs">{article.category}</span>
                              <span className="text-xs dark:text-slate-400 text-slate-500">مقال مميز ⭐</span>
                            </div>
                            <h3 className="text-lg font-bold dark:text-white text-slate-900 mb-2 group-hover:text-cyan-400 transition-colors">
                              {article.title}
                            </h3>
                            <p className="dark:text-slate-400 text-slate-600 text-sm leading-relaxed mb-4 line-clamp-2">
                              {article.excerpt}
                            </p>
                            <div className="flex items-center justify-between text-xs dark:text-slate-500 text-slate-400">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {article.readTime} دقائق قراءة
                                </span>
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" /> {article.views.toLocaleString("ar-EG")}
                                </span>
                              </div>
                              <span className="flex items-center gap-1 text-cyan-400 font-medium group-hover:gap-2 transition-all">
                                اقرأ المزيد <ChevronLeft className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      category === cat
                        ? "gradient-bg text-white shadow-lg shadow-cyan-500/25"
                        : "dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 hover:text-cyan-400"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {displayArticles.length === 0 ? (
                <div className="text-center py-20">
                  <Newspaper className="w-16 h-16 dark:text-slate-700 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold dark:text-slate-400 text-slate-600 mb-2">
                    لا توجد مقالات
                  </h3>
                  <p className="dark:text-slate-500 text-slate-400 text-sm">
                    جرب تغيير كلمة البحث أو الفئة
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-6">
                    <BookOpen className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-xl font-bold dark:text-white text-slate-900">
                      {search || category !== "الكل" ? "نتائج البحث" : "أحدث المقالات"}
                    </h2>
                    <span className="badge badge-violet text-xs">
                      {displayArticles.length} مقال
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {displayArticles.map((article, i) => (
                      <motion.div
                        key={article.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -3 }}
                      >
                        <Link href={`/articles/${article.slug || article.id}`}>
                          <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-5 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/5 transition-all group h-full flex flex-col">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="badge text-xs dark:bg-violet-500/20 dark:text-violet-300 bg-violet-50 text-violet-700 border dark:border-violet-500/20 border-violet-200">
                                {article.category}
                              </span>
                            </div>
                            <h3 className="font-bold dark:text-white text-slate-900 mb-2 group-hover:text-cyan-400 transition-colors leading-snug">
                              {article.title}
                            </h3>
                            <p className="dark:text-slate-400 text-slate-600 text-sm leading-relaxed mb-4 line-clamp-2 flex-1">
                              {article.excerpt}
                            </p>
                            <div className="flex flex-wrap gap-1 mb-3">
                              {(article.tags ?? []).slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="flex items-center gap-0.5 px-2 py-0.5 text-xs rounded-lg dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500"
                                >
                                  <Tag className="w-2.5 h-2.5" /> {tag}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center justify-between text-xs dark:text-slate-500 text-slate-400 mt-auto">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {article.readTime} د
                                </span>
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" /> {article.views.toLocaleString("ar-EG")}
                                </span>
                              </div>
                              <span className="dark:text-slate-500 text-slate-400">
                                {formatDate(article.createdAt)}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default function ArticlesPage() {
  const { checking, blocks } = useRouteOverride("articles");
  if (checking) return <MainLayout><div className="min-h-[80vh] dark:bg-[#0a0f1e] bg-slate-50" /></MainLayout>;
  if (blocks) return <MainLayout><BlockRenderer blocks={blocks} /></MainLayout>;
  return <ArticlesPageDefault />;
}
