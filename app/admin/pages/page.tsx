"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminSectionGuard } from "@/components/admin/AdminSectionGuard";
import { api } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import { invalidateSiteConfigCache } from "@/hooks/useRouteOverride";
import {
  LayoutTemplate, Plus, Trash2, Edit,
  Loader2, RefreshCw, Layers, ExternalLink, Search,
  Download, Home, BookOpen, Newspaper, Code2, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, Zap, AlertCircle, CheckCircle2, Settings,
} from "lucide-react";

interface Page {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  isPublished: boolean;
  blockCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── Legacy Page Templates ─────────────────────────────────────────────────────
const LEGACY_TEMPLATES = [
  {
    id: "home",
    label: "الرئيسية",
    icon: Home,
    color: "cyan",
    description: "Hero + إحصائيات + كورسات + تصنيفات + مميزات + CTA",
    blocks: 6,
    slug: "home",
    emoji: "🏠",
  },
  {
    id: "courses",
    label: "الكورسات",
    icon: BookOpen,
    color: "violet",
    description: "متصفح كورسات كامل مع بحث وفلترة وتصنيفات",
    blocks: 1,
    slug: "courses",
    emoji: "📚",
  },
  {
    id: "articles",
    label: "المقالات",
    icon: Newspaper,
    color: "amber",
    description: "متصفح مقالات مع مقالات مميزة وتصنيفات وبحث",
    blocks: 1,
    slug: "articles",
    emoji: "📰",
  },
  {
    id: "problems",
    label: "التحديات",
    icon: Code2,
    color: "green",
    description: "متصفح تحديات مع إحصائيات وفلتر الصعوبة واللغة",
    blocks: 1,
    slug: "problems",
    emoji: "💻",
  },
];

const COLOR_CLASSES: Record<string, { badge: string; glow: string; btn: string }> = {
  cyan:   { badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",    glow: "hover:border-cyan-500/40 hover:shadow-cyan-500/10",   btn: "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20" },
  violet: { badge: "bg-violet-500/10 text-violet-400 border-violet-500/20", glow: "hover:border-violet-500/40 hover:shadow-violet-500/10", btn: "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20" },
  amber:  { badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",   glow: "hover:border-amber-500/40 hover:shadow-amber-500/10",  btn: "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" },
  green:  { badge: "bg-green-500/10 text-green-400 border-green-500/20",   glow: "hover:border-green-500/40 hover:shadow-green-500/10",  btn: "bg-green-500/10 text-green-400 hover:bg-green-500/20" },
};

// ── Core Routes config ────────────────────────────────────────────────────────
const CORE_ROUTES = [
  { key: "home",     label: "الرئيسية",  icon: Home,     emoji: "🏠", path: "/" },
  { key: "courses",  label: "الكورسات",  icon: BookOpen,  emoji: "📚", path: "/courses" },
  { key: "articles", label: "المقالات",  icon: Newspaper, emoji: "📰", path: "/articles" },
  { key: "problems", label: "التحديات", icon: Code2,     emoji: "💻", path: "/problems" },
];

// ── Page Override Manager ─────────────────────────────────────────────────────
function PageOverrideManager({ pages }: { pages: Page[] }) {
  const [open, setOpen] = useState(false);
  const [routes, setRoutes] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const publishedPages = pages.filter(p => p.isPublished);

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Record<string, string>>("/admin/settings/site-routes");
      setRoutes(data);
      setPending(data);
      setDirty(false);
    } catch { toast.error("تعذّر تحميل إعدادات المسارات"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (open) fetchRoutes(); }, [open, fetchRoutes]);

  const handleChange = (key: string, slug: string) => {
    const next = { ...pending, [key]: slug };
    if (!slug) delete next[key];
    setPending(next);
    setDirty(JSON.stringify(next) !== JSON.stringify(routes));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/admin/settings/site-routes", pending);
      setRoutes(pending);
      setDirty(false);
      invalidateSiteConfigCache();
      toast.success("تم حفظ إعدادات المسارات — ستنعكس التغييرات فوراً");
    } catch { toast.error("حدث خطأ في الحفظ"); }
    finally { setSaving(false); }
  };

  const handleReset = () => { setPending(routes); setDirty(false); };

  const activeCount = Object.keys(pending).filter(k => pending[k]).length;

  return (
    <div className="mb-6 dark:bg-[#0d1424] bg-slate-50 rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-right hover:dark:bg-white/5 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/20 flex items-center justify-center">
            <Settings className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold dark:text-white text-slate-900">مدير تفعيل الصفحات</p>
              {activeCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                  {activeCount} مفعّل
                </span>
              )}
            </div>
            <p className="text-xs dark:text-slate-500 text-slate-400">تحكم بأي صفحة تعرض كوداً ثابتاً أو تصميم Page Builder</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 dark:text-slate-400 text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 dark:text-slate-400 text-slate-500 flex-shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t dark:border-white/5 border-slate-200">
              {/* Info bar */}
              <div className="flex items-start gap-2 mt-4 mb-5 p-3 rounded-xl dark:bg-amber-500/5 bg-amber-50 border dark:border-amber-500/15 border-amber-200">
                <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs dark:text-amber-300 text-amber-700 leading-relaxed">
                  لتفعيل صفحة من Page Builder على مسار أصيل (مثل <span dir="ltr" className="font-mono">/courses</span>)، اختر الصفحة المطلوبة من القائمة. اتركها فارغة للعودة للكود الثابت.
                </p>
              </div>

              {loading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-violet-400 animate-spin" /></div>
              ) : (
                <div className="space-y-3">
                  {CORE_ROUTES.map(route => {
                    const currentSlug = pending[route.key] ?? "";
                    const isActive = !!currentSlug;
                    const assignedPage = publishedPages.find(p => p.slug === currentSlug);
                    const RouteIcon = route.icon;

                    return (
                      <div key={route.key}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                          isActive
                            ? "dark:bg-green-500/5 bg-green-50 dark:border-green-500/20 border-green-200"
                            : "dark:bg-white/3 bg-white dark:border-white/8 border-slate-200"
                        }`}
                      >
                        {/* Icon + Route label */}
                        <div className="flex items-center gap-2.5 flex-shrink-0 w-32">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? "dark:bg-green-500/15 bg-green-100" : "dark:bg-white/5 bg-slate-100"}`}>
                            <RouteIcon className={`w-4 h-4 ${isActive ? "text-green-400" : "dark:text-slate-400 text-slate-500"}`} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold dark:text-white text-slate-900">{route.label}</p>
                            <p className="text-xs dark:text-slate-500 text-slate-400 font-mono" dir="ltr">{route.path}</p>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="flex-shrink-0">
                          {isActive ? (
                            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Page Builder
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full dark:bg-slate-700/50 bg-slate-100 dark:text-slate-400 text-slate-500 border dark:border-white/10 border-slate-200">
                              <AlertCircle className="w-3 h-3" /> كود ثابت
                            </span>
                          )}
                        </div>

                        {/* Page selector */}
                        <div className="flex-1 min-w-0">
                          <select
                            value={currentSlug}
                            onChange={e => handleChange(route.key, e.target.value)}
                            className="w-full px-3 py-2 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-violet-500 text-sm appearance-none cursor-pointer transition-colors"
                          >
                            <option value="" className="dark:bg-[#111827]">— كود ثابت (الأصيل) —</option>
                            {publishedPages.map(p => (
                              <option key={p.id} value={p.slug} className="dark:bg-[#111827]">
                                {p.title} — /{p.slug} ({p.blockCount} بلوك)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Toggle visual */}
                        <button
                          onClick={() => handleChange(route.key, isActive ? "" : (assignedPage?.slug ?? ""))}
                          className="flex-shrink-0"
                          title={isActive ? "إلغاء التفعيل" : ""}
                        >
                          {isActive ? (
                            <ToggleRight className="w-8 h-8 text-green-400" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 dark:text-slate-600 text-slate-300" />
                          )}
                        </button>

                        {/* Edit link */}
                        {isActive && assignedPage && (
                          <Link
                            href={`/admin/pages/${assignedPage.id}`}
                            className="flex-shrink-0 w-8 h-8 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center dark:text-slate-400 text-slate-500 hover:text-violet-400 transition-colors"
                            title="تعديل الصفحة"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action bar */}
              {dirty && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between mt-4 p-3 rounded-xl dark:bg-violet-500/10 bg-violet-50 border dark:border-violet-500/20 border-violet-200"
                >
                  <p className="text-xs dark:text-violet-300 text-violet-700 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> تغييرات غير محفوظة
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={handleReset} className="text-xs px-3 py-1.5 rounded-lg dark:bg-white/5 bg-white dark:text-slate-300 text-slate-600 hover:opacity-80 transition-opacity">
                      تراجع
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition-colors disabled:opacity-60">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      حفظ التغييرات
                    </button>
                  </div>
                </motion.div>
              )}

              {/* No published pages warning */}
              {publishedPages.length === 0 && !loading && (
                <p className="text-xs dark:text-slate-500 text-slate-400 text-center mt-4">
                  لا توجد صفحات منشورة — أنشئ صفحة وانشرها أولاً أو استورد صفحة قديمة
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Legacy Import Section ─────────────────────────────────────────────────────
function LegacyImportSection({ onImported }: { onImported: (p: Page) => void }) {
  const [open, setOpen] = useState(false);
  const [seeding, setSeeding] = useState<string | null>(null);

  const handleSeed = async (template: string, label: string) => {
    setSeeding(template);
    try {
      const page = await api.post<Page>("/admin/pages/seed-legacy", { template });
      toast.success(`تم استيراد صفحة "${label}" — ${page.blockCount} بلوك`);
      onImported(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ في الاستيراد");
    } finally {
      setSeeding(null);
    }
  };

  return (
    <div className="mb-4 dark:bg-[#0d1424] bg-slate-50 rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-right hover:dark:bg-white/5 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20 flex items-center justify-center">
            <Download className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-right">
            <p className="text-sm font-bold dark:text-white text-slate-900">استيراد صفحة قديمة إلى المحرر</p>
            <p className="text-xs dark:text-slate-500 text-slate-400">حوّل الرئيسية أو الكورسات أو المقالات أو التحديات إلى بلوكات قابلة للتعديل</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 dark:text-slate-400 text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 dark:text-slate-400 text-slate-500 flex-shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t dark:border-white/5 border-slate-200">
              <p className="text-xs dark:text-slate-500 text-slate-400 mt-4 mb-4 leading-relaxed">
                اختر صفحة أصيلة لتحويلها إلى بلوكات — ستُنشأ كصفحة منشورة جاهزة للتعديل. إذا كان الـ slug مستخدماً ستظهر رسالة خطأ.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {LEGACY_TEMPLATES.map(tpl => {
                  const clr = COLOR_CLASSES[tpl.color];
                  const isLoading = seeding === tpl.id;
                  return (
                    <motion.div key={tpl.id} whileHover={{ y: -2 }} className={`dark:bg-[#111827] bg-white rounded-xl border dark:border-white/10 border-slate-200 p-4 hover:shadow-lg transition-all ${clr.glow}`}>
                      <div className="text-2xl mb-2">{tpl.emoji}</div>
                      <p className="font-bold dark:text-white text-slate-900 text-sm mb-1">{tpl.label}</p>
                      <p className="text-xs dark:text-slate-500 text-slate-400 mb-3 leading-relaxed">{tpl.description}</p>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${clr.badge}`}>{tpl.blocks} بلوك</span>
                        <span className="text-xs dark:text-slate-500 text-slate-400 font-mono">/{tpl.slug}</span>
                      </div>
                      <button
                        onClick={() => handleSeed(tpl.id, tpl.label)}
                        disabled={!!seeding}
                        className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 ${clr.btn}`}
                      >
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        {isLoading ? "جاري الاستيراد..." : "استيراد"}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Create Page Modal ─────────────────────────────────────────────────────────
function CreatePageModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Page) => void }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const autoSlug = (t: string) =>
    t.toLowerCase().trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-").replace(/^-|-$/g, "");

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (!slug || slug === autoSlug(title)) setSlug(autoSlug(v));
  };

  const create = async () => {
    if (!title.trim()) { toast.error("العنوان مطلوب"); return; }
    if (!slug.trim()) { toast.error("الـ slug مطلوب"); return; }
    setLoading(true);
    try {
      const page = await api.post<Page>("/admin/pages", { title, slug, description });
      toast.success("تم إنشاء الصفحة");
      onCreated(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md dark:bg-[#0f1629] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 shadow-2xl">
        <h2 className="text-lg font-bold dark:text-white text-slate-900 mb-5 flex items-center gap-2">
          <LayoutTemplate className="w-5 h-5 text-cyan-400" /> إنشاء صفحة جديدة
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium dark:text-slate-400 text-slate-500 mb-1.5 block">عنوان الصفحة *</label>
            <input value={title} onChange={e => handleTitleChange(e.target.value)}
              placeholder="مثال: صفحة التسعير"
              className="w-full px-3 py-2.5 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium dark:text-slate-400 text-slate-500 mb-1.5 block">الـ Slug (مسار URL) *</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 focus-within:border-cyan-500">
              <span className="text-xs dark:text-slate-500 text-slate-400">/</span>
              <input value={slug} onChange={e => setSlug(autoSlug(e.target.value))} dir="ltr"
                placeholder="pricing"
                className="flex-1 bg-transparent dark:text-white text-slate-900 outline-none text-sm font-mono" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium dark:text-slate-400 text-slate-500 mb-1.5 block">وصف مختصر (اختياري)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="وصف الصفحة..."
              className="w-full px-3 py-2.5 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm resize-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={create} disabled={loading}
            className="flex-1 py-2.5 rounded-xl gradient-bg text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            إنشاء الصفحة
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 text-sm hover:opacity-80 transition-opacity">
            إلغاء
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminPagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Page[]>("/admin/pages");
      setPages(data);
    } catch { toast.error("تعذّر تحميل الصفحات"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const deletePage = async (id: number, title: string) => {
    if (!confirm(`هل تريد حذف صفحة "${title}"؟`)) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/pages/${id}`);
      setPages(p => p.filter(x => x.id !== id));
      toast.success("تم حذف الصفحة");
    } catch { toast.error("حدث خطأ في الحذف"); }
    finally { setDeleting(null); }
  };

  const filtered = pages.filter(p =>
    p.title.includes(search) || p.slug.includes(search.toLowerCase())
  );

  return (
    <AdminSectionGuard section="pages">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <LayoutTemplate className="w-6 h-6 text-cyan-400" />
              <h1 className="text-2xl font-black dark:text-white text-slate-900">الصفحات</h1>
            </div>
            <p className="dark:text-slate-400 text-slate-500 text-sm">أنشئ وعدّل صفحات الموقع باستخدام البلوكات الجاهزة</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchPages} className="w-9 h-9 rounded-xl dark:bg-white/5 bg-slate-100 flex items-center justify-center dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-bg text-white text-sm font-semibold hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" /> صفحة جديدة
            </button>
          </div>
        </div>

        {/* Page Override Manager */}
        <PageOverrideManager pages={pages} />

        {/* Legacy Import */}
        <LegacyImportSection onImported={(p) => setPages(prev => [p, ...prev])} />

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-500 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن صفحة..."
            className="w-full pr-9 pl-4 py-2.5 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm" />
        </div>

        {/* Pages list */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 dark:text-slate-500 text-slate-400">
            <LayoutTemplate className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">{search ? "لا نتائج" : "لا توجد صفحات — أنشئ صفحة جديدة أو استورد صفحة قديمة"}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            <AnimatePresence>
              {filtered.map((page) => (
                <motion.div key={page.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-4 p-4 dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 hover:border-cyan-500/30 transition-all group">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${page.isPublished ? "bg-green-400" : "bg-slate-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold dark:text-white text-slate-900 text-sm truncate">{page.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${page.isPublished ? "dark:bg-green-500/10 bg-green-50 text-green-500 dark:border-green-500/20 border-green-200" : "dark:bg-slate-700/50 bg-slate-100 dark:text-slate-400 text-slate-500 dark:border-white/10 border-slate-200"}`}>
                        {page.isPublished ? "منشور" : "مسودة"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs dark:text-slate-500 text-slate-400">
                      <span dir="ltr" className="font-mono">/{page.slug}</span>
                      <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {page.blockCount} بلوك</span>
                      <span>{new Date(page.updatedAt).toLocaleDateString("ar-EG")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {page.isPublished && (
                      <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer"
                        className="w-8 h-8 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <Link href={`/admin/pages/${page.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg dark:bg-cyan-500/10 bg-cyan-50 text-cyan-500 text-xs font-medium hover:bg-cyan-500/20 transition-colors">
                      <Edit className="w-3.5 h-3.5" /> تعديل
                    </Link>
                    <button onClick={() => deletePage(page.id, page.title)} disabled={deleting === page.id}
                      className="w-8 h-8 rounded-lg dark:bg-red-500/10 bg-red-50 text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center">
                      {deleting === page.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {showCreate && (
        <CreatePageModal
          onClose={() => setShowCreate(false)}
          onCreated={(p) => { setPages(prev => [p, ...prev]); setShowCreate(false); }}
        />
      )}
    </AdminSectionGuard>
  );
}
