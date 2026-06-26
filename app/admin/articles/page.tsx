"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AdminSectionGuard } from "@/components/admin/AdminSectionGuard";
import Link from "next/link";
import {
  Newspaper, Search, Plus, Edit, Trash2, Loader2,
  RefreshCw, ChevronLeft, ChevronRight, Eye, Globe,
  Archive, Clock, FileText, Star, TrendingUp, BarChart2,
  CheckSquare, Square, MoreVertical, Filter
} from "lucide-react";

interface Article {
  id: number;
  title: string;
  slug: string | null;
  excerpt: string;
  category: string;
  authorName: string;
  readTime: number;
  wordCount: number;
  views: number;
  isFeatured: boolean;
  isPublished: boolean;
  status: string;
  publishedAt: string | null;
  focusKeyword: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: string;
}

const STATUS_TABS = [
  { id: "all", label: "الكل", icon: <BarChart2 className="w-3.5 h-3.5" /> },
  { id: "published", label: "منشور", icon: <Globe className="w-3.5 h-3.5" /> },
  { id: "draft", label: "مسودة", icon: <FileText className="w-3.5 h-3.5" /> },
  { id: "scheduled", label: "مجدول", icon: <Clock className="w-3.5 h-3.5" /> },
  { id: "archived", label: "مؤرشف", icon: <Archive className="w-3.5 h-3.5" /> },
];

const STATUS_COLORS: Record<string, string> = {
  published: "dark:bg-green-500/10 bg-green-50 text-green-500 dark:border-green-500/20 border-green-100",
  draft: "dark:bg-slate-700/50 bg-slate-100 dark:text-slate-400 text-slate-500 dark:border-white/10 border-slate-200",
  scheduled: "dark:bg-amber-500/10 bg-amber-50 text-amber-500 dark:border-amber-500/20 border-amber-100",
  archived: "dark:bg-slate-800 bg-slate-100 dark:text-slate-500 text-slate-400 dark:border-white/5 border-slate-200",
};

const STATUS_LABELS: Record<string, string> = {
  published: "منشور", draft: "مسودة", scheduled: "مجدول", archived: "مؤرشف",
};

function getSeoScore(a: Article): number {
  let s = 0;
  if (a.metaTitle) s += 25;
  if (a.metaDescription) s += 25;
  if (a.focusKeyword) s += 25;
  if (a.wordCount >= 300) s += 25;
  return s;
}

function SeoScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? "text-green-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  return <span className={`text-xs font-bold ${color}`}>{score}%</span>;
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const limit = 20;

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });
      const data = await api.get<Article[]>(`/admin/articles?${params}`);
      setArticles(Array.isArray(data) ? data : []);
      setSelected(new Set());
    } catch {
      toast.error("حدث خطأ في تحميل المقالات");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchArticles, 300);
    return () => clearTimeout(t);
  }, [fetchArticles]);

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المقال؟")) return;
    try {
      await api.delete(`/admin/articles/${id}`);
      toast.success("تم حذف المقال");
      fetchArticles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    }
  };

  const handleBulk = async (action: string) => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    setShowBulkMenu(false);
    try {
      await api.post("/admin/articles/bulk", { ids: [...selected], action });
      toast.success(`تم تنفيذ الإجراء على ${selected.size} مقال`);
      fetchArticles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === paginated.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map((a) => a.id)));
    }
  };

  const paginated = articles.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(articles.length / limit);

  const stats = {
    total: articles.length,
    published: articles.filter((a) => a.status === "published").length,
    draft: articles.filter((a) => a.status === "draft").length,
    totalViews: articles.reduce((s, a) => s + a.views, 0),
  };

  return (
    <AdminSectionGuard section="articles">
      <div dir="rtl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black dark:text-white text-slate-900 mb-1">إدارة المقالات</h1>
            <p className="dark:text-slate-400 text-slate-600 text-sm">نظام إدارة محتوى احترافي مع تحسين SEO</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchArticles} className="flex items-center gap-2 px-3 py-2 rounded-xl dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 hover:text-cyan-400 transition-colors text-sm">
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link href="/admin/articles/editor/new"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-bold transition-colors">
              <Plus className="w-4 h-4" />
              مقال جديد
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "إجمالي المقالات", value: stats.total.toLocaleString("ar-EG"), icon: <Newspaper className="w-4 h-4 text-violet-400" />, color: "from-violet-500/20" },
            { label: "منشور", value: stats.published.toLocaleString("ar-EG"), icon: <Globe className="w-4 h-4 text-green-400" />, color: "from-green-500/20" },
            { label: "مسودة", value: stats.draft.toLocaleString("ar-EG"), icon: <FileText className="w-4 h-4 text-slate-400" />, color: "from-slate-500/20" },
            { label: "إجمالي المشاهدات", value: stats.totalViews.toLocaleString("ar-EG"), icon: <TrendingUp className="w-4 h-4 text-cyan-400" />, color: "from-cyan-500/20" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`rounded-xl border dark:border-white/10 border-slate-200 p-3 dark:bg-gradient-to-br dark:${s.color} dark:to-transparent bg-white`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs dark:text-slate-400 text-slate-500">{s.label}</span>
                {s.icon}
              </div>
              <p className="text-xl font-black dark:text-white text-slate-900">{s.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
          <div className="p-4 border-b dark:border-white/10 border-slate-100 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-400 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث عن مقال..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full py-2 pr-9 pl-3 rounded-lg dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm"
                />
              </div>
              {selected.size > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowBulkMenu(!showBulkMenu)}
                    disabled={bulkLoading}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
                  >
                    {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MoreVertical className="w-3.5 h-3.5" />}
                    {selected.size} محدد
                  </button>
                  {showBulkMenu && (
                    <div className="absolute top-full mt-1 left-0 dark:bg-[#1a2235] bg-white rounded-xl border dark:border-white/10 border-slate-200 shadow-xl z-20 min-w-40 py-1">
                      {[
                        { action: "publish", label: "نشر المحدد", color: "text-green-400" },
                        { action: "draft", label: "تحويل لمسودة", color: "dark:text-slate-300 text-slate-700" },
                        { action: "archive", label: "أرشفة المحدد", color: "dark:text-slate-400 text-slate-500" },
                        { action: "delete", label: "حذف المحدد", color: "text-red-400" },
                      ].map((item) => (
                        <button
                          key={item.action}
                          onClick={() => handleBulk(item.action)}
                          className={`w-full text-right px-4 py-2 text-sm hover:dark:bg-white/5 hover:bg-slate-50 transition-colors ${item.color}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-1 flex-wrap">
              {STATUS_TABS.map((tab) => {
                const count = tab.id === "all" ? articles.length : articles.filter((a) => a.status === tab.id).length;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setStatusFilter(tab.id); setPage(1); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                      ${statusFilter === tab.id
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "dark:text-slate-400 text-slate-500 dark:hover:bg-white/5 hover:bg-slate-50"
                      }`}
                  >
                    {tab.icon}
                    {tab.label}
                    <span className="dark:bg-white/10 bg-slate-200 px-1.5 py-0.5 rounded-full">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="dark:bg-white/5 bg-slate-50 text-right">
                    <th className="px-3 py-3 w-8">
                      <button onClick={toggleSelectAll} className="dark:text-slate-400 text-slate-400 hover:text-cyan-400 transition-colors">
                        {selected.size === paginated.length && paginated.length > 0
                          ? <CheckSquare className="w-4 h-4 text-cyan-400" />
                          : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500">المقال</th>
                    <th className="px-3 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500 hidden sm:table-cell">الحالة</th>
                    <th className="px-3 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500 hidden md:table-cell">SEO</th>
                    <th className="px-3 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500 hidden lg:table-cell">المشاهدات</th>
                    <th className="px-3 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500 hidden xl:table-cell">التصنيف</th>
                    <th className="px-3 py-3 text-xs font-semibold dark:text-slate-400 text-slate-500">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-white/5 divide-slate-100">
                  {paginated.map((article, i) => {
                    const seoScore = getSeoScore(article);
                    const isSelected = selected.has(article.id);
                    return (
                      <motion.tr
                        key={article.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className={`hover:dark:bg-white/5 hover:bg-slate-50 transition-colors ${isSelected ? "dark:bg-cyan-500/5 bg-cyan-50" : ""}`}
                      >
                        <td className="px-3 py-3">
                          <button onClick={() => toggleSelect(article.id)} className="dark:text-slate-400 text-slate-400 hover:text-cyan-400 transition-colors">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-cyan-400" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Newspaper className="w-4 h-4 text-violet-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium dark:text-white text-slate-900 line-clamp-1">{article.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs dark:text-slate-500 text-slate-400">{article.readTime}د · {article.wordCount} كلمة</span>
                                {article.isFeatured && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 hidden sm:table-cell">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[article.status] || STATUS_COLORS.draft}`}>
                            {STATUS_LABELS[article.status] || article.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 hidden md:table-cell">
                          <SeoScoreBadge score={seoScore} />
                        </td>
                        <td className="px-3 py-3 hidden lg:table-cell">
                          <div className="flex items-center gap-1 dark:text-slate-400 text-slate-600 text-sm">
                            <Eye className="w-3.5 h-3.5" />
                            {article.views.toLocaleString("ar-EG")}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm dark:text-slate-400 text-slate-600 hidden xl:table-cell">{article.category}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <Link href={`/admin/articles/editor/${article.id}`}
                              className="w-7 h-7 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 flex items-center justify-center text-cyan-400 transition-colors">
                              <Edit className="w-3.5 h-3.5" />
                            </Link>
                            <a href={`/articles/${article.slug || article.id}`} target="_blank" rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 flex items-center justify-center dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors">
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                            <button onClick={() => handleDelete(article.id)}
                              className="w-7 h-7 rounded-lg dark:hover:bg-red-500/10 hover:bg-red-50 flex items-center justify-center text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>

              {paginated.length === 0 && (
                <div className="text-center py-16 dark:text-slate-500 text-slate-400">
                  <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">لا توجد مقالات</p>
                  <p className="text-sm mt-1">
                    {statusFilter !== "all" ? "جرب تغيير الفلتر" : "ابدأ بإنشاء مقالك الأول"}
                  </p>
                </div>
              )}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t dark:border-white/10 border-slate-100">
              <p className="text-sm dark:text-slate-400 text-slate-600">
                {articles.length.toLocaleString("ar-EG")} مقال · صفحة {page} من {totalPages}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="w-8 h-8 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center disabled:opacity-40 hover:text-cyan-400 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                  className="w-8 h-8 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center disabled:opacity-40 hover:text-cyan-400 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminSectionGuard>
  );
}
