"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminSectionGuard } from "@/components/admin/AdminSectionGuard";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { invalidateSiteConfigCache } from "@/hooks/useRouteOverride";
import {
  Settings, Navigation, Globe, Plus, Trash2, Eye, EyeOff,
  GripVertical, Loader2, Check, X, RefreshCw, Bot, Key, Zap, Cpu, ExternalLink,
  LayoutTemplate, Map, ChevronDown, ChevronUp, Pencil, Home, BookOpen,
  FileText, Code2, Wrench, Search, Link2, FolderOpen, Save,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem { id: number; type: string; label: string; href: string; isVisible: boolean; order: number; }
interface FooterLink { label: string; href: string; }
interface FooterSection { key: string; title: string; links: FooterLink[]; }
interface PageItem { id: number; title: string; slug: string; isPublished: boolean; }

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

type Tab = "pages" | "footer" | "navbar" | "ai";

const TABS: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "pages",  label: "الصفحات",       icon: <Map className="w-4 h-4" />,        color: "text-emerald-400" },
  { key: "footer", label: "قوائم الفوتر",  icon: <Globe className="w-4 h-4" />,      color: "text-violet-400" },
  { key: "navbar", label: "قائمة التنقل",  icon: <Navigation className="w-4 h-4" />, color: "text-cyan-400"   },
  { key: "ai",     label: "الذكاء الاصطناعي", icon: <Bot className="w-4 h-4" />,     color: "text-amber-400"  },
];

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="flex gap-1.5 mb-6 p-1 rounded-2xl dark:bg-white/5 bg-slate-100 w-fit flex-wrap">
      {TABS.map(t => (
        <button key={t.key} onClick={() => setTab(t.key)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            tab === t.key
              ? `dark:bg-[#111827] bg-white shadow-sm ${t.color} dark:shadow-black/30`
              : "dark:text-slate-400 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}>
          <span className={tab === t.key ? t.color : ""}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Page Routes Editor ───────────────────────────────────────────────────────

const ROUTE_DEFS = [
  { key: "home",     label: "الرئيسية",  path: "/",         icon: <Home className="w-4 h-4" /> },
  { key: "courses",  label: "الكورسات",  path: "/courses",  icon: <BookOpen className="w-4 h-4" /> },
  { key: "articles", label: "المقالات",  path: "/articles", icon: <FileText className="w-4 h-4" /> },
  { key: "problems", label: "التحديات",  path: "/problems", icon: <Code2 className="w-4 h-4" /> },
  { key: "tools",    label: "الأدوات",   path: "/tools",    icon: <Wrench className="w-4 h-4" /> },
];

function PageRoutesEditor() {
  const [routes, setRoutes] = useState<Record<string, string>>({});
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        api.get<Record<string, string>>("/admin/settings/site-routes"),
        api.get<PageItem[]>("/admin/pages"),
      ]);
      setRoutes(r ?? {});
      setPages((p ?? []).filter(pg => pg.isPublished));
    } catch { toast.error("خطأ في تحميل البيانات"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/admin/settings/site-routes", routes);
      invalidateSiteConfigCache();
      toast.success("تم حفظ إعدادات الصفحات");
    } catch { toast.error("خطأ في الحفظ"); }
    finally { setSaving(false); }
  };

  const setRoute = (key: string, val: string) => setRoutes(prev => ({ ...prev, [key]: val }));
  const clearRoute = (key: string) => setRoutes(prev => { const n = { ...prev }; delete n[key]; return n; });

  return (
    <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold dark:text-white text-slate-900 flex items-center gap-2 text-lg">
            <Map className="w-5 h-5 text-emerald-400" />
            ربط الصفحات بالروابط
          </h3>
          <p className="text-sm dark:text-slate-400 text-slate-500 mt-1">
            اختر صفحة مخصصة لتحل محل أي صفحة أصلية من صفحات الموقع
          </p>
        </div>
        <button onClick={load} className="w-8 h-8 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center dark:text-slate-400 text-slate-500 hover:text-emerald-400 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {ROUTE_DEFS.map(def => {
            const assigned = routes[def.key] ?? "";
            const assignedPage = pages.find(p => p.slug === assigned);
            return (
              <div key={def.key}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  assigned
                    ? "dark:bg-emerald-500/5 bg-emerald-50 dark:border-emerald-500/20 border-emerald-200"
                    : "dark:bg-white/3 bg-slate-50 dark:border-white/8 border-slate-100"
                }`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  assigned ? "dark:bg-emerald-500/20 bg-emerald-100 text-emerald-500" : "dark:bg-white/5 bg-slate-200 dark:text-slate-400 text-slate-500"
                }`}>
                  {def.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm dark:text-white text-slate-800">{def.label}</p>
                    <span className="text-xs dark:text-slate-500 text-slate-400 font-mono" dir="ltr">{def.path}</span>
                  </div>
                  <div className="relative">
                    <select
                      value={assigned}
                      onChange={e => {
                        if (e.target.value === "") clearRoute(def.key);
                        else setRoute(def.key, e.target.value);
                      }}
                      className="w-full appearance-none pl-8 pr-3 py-2 text-sm rounded-lg dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">— الصفحة الافتراضية (الأصلية) —</option>
                      {pages.map(p => (
                        <option key={p.id} value={p.slug}>{p.title}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                {assigned && (
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> مخصص
                    </span>
                    {assignedPage && (
                      <a href={`/${assignedPage.slug}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs dark:text-slate-500 text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> معاينة
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {pages.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed dark:border-white/10 border-slate-200 rounded-xl">
              <LayoutTemplate className="w-10 h-10 dark:text-slate-600 text-slate-300 mx-auto mb-3" />
              <p className="text-sm dark:text-slate-400 text-slate-500 font-medium">لا توجد صفحات منشورة</p>
              <p className="text-xs dark:text-slate-500 text-slate-400 mt-1">
                أنشئ صفحات من <a href="/admin/pages" className="text-emerald-400 hover:underline">منشئ الصفحات</a> وانشرها أولاً
              </p>
            </div>
          )}
        </div>
      )}

      <button onClick={save} disabled={saving || loading}
        className="w-full py-3 rounded-xl gradient-bg text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        حفظ إعدادات الصفحات
      </button>
    </div>
  );
}

// ─── Footer Menus Editor ──────────────────────────────────────────────────────

function FooterMenusEditor() {
  const [sections, setSections] = useState<FooterSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleVal, setEditTitleVal] = useState("");
  const [addLinkSection, setAddLinkSection] = useState<string | null>(null);
  const [addLinkMode, setAddLinkMode] = useState<"page" | "custom">("page");
  const [pageSearch, setPageSearch] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [customHref, setCustomHref] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        api.get<FooterSection[]>("/admin/settings/footer-menus"),
        api.get<PageItem[]>("/admin/pages"),
      ]);
      setSections(s ?? []);
      setPages(p ?? []);
    } catch { toast.error("خطأ في تحميل البيانات"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/admin/settings/footer-menus", sections);
      invalidateSiteConfigCache();
      toast.success("تم حفظ قوائم الفوتر");
    } catch { toast.error("خطأ في الحفظ"); }
    finally { setSaving(false); }
  };

  const moveSection = (i: number, dir: -1 | 1) => {
    const n = [...sections];
    const j = i + dir;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j], n[i]];
    setSections(n);
  };

  const deleteSection = (key: string) => {
    if (!confirm("هل تريد حذف هذا القسم وكل روابطه؟")) return;
    setSections(s => s.filter(x => x.key !== key));
  };

  const saveTitle = (key: string) => {
    if (!editTitleVal.trim()) return;
    setSections(s => s.map(x => x.key === key ? { ...x, title: editTitleVal.trim() } : x));
    setEditingTitle(null);
  };

  const removeLink = (sectionKey: string, idx: number) => {
    setSections(s => s.map(x => x.key === sectionKey ? { ...x, links: x.links.filter((_, i) => i !== idx) } : x));
  };

  const moveLinkUp = (sectionKey: string, idx: number) => {
    if (idx === 0) return;
    setSections(s => s.map(x => {
      if (x.key !== sectionKey) return x;
      const links = [...x.links];
      [links[idx - 1], links[idx]] = [links[idx], links[idx - 1]];
      return { ...x, links };
    }));
  };

  const moveLinkDown = (sectionKey: string, idx: number) => {
    setSections(s => s.map(x => {
      if (x.key !== sectionKey) return x;
      if (idx >= x.links.length - 1) return x;
      const links = [...x.links];
      [links[idx], links[idx + 1]] = [links[idx + 1], links[idx]];
      return { ...x, links };
    }));
  };

  const addLink = (sectionKey: string, link: FooterLink) => {
    setSections(s => s.map(x => x.key === sectionKey ? { ...x, links: [...x.links, link] } : x));
    setAddLinkSection(null);
    setPageSearch("");
    setCustomLabel("");
    setCustomHref("");
  };

  const addSection = () => {
    if (!newSectionTitle.trim()) return;
    const key = `section_${Date.now()}`;
    setSections(s => [...s, { key, title: newSectionTitle.trim(), links: [] }]);
    setNewSectionTitle("");
    setAddingSection(false);
  };

  const filteredPages = pages.filter(p =>
    !pageSearch || p.title.toLowerCase().includes(pageSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold dark:text-white text-slate-900 flex items-center gap-2 text-lg">
              <Globe className="w-5 h-5 text-violet-400" />
              قوائم الفوتر
            </h3>
            <p className="text-sm dark:text-slate-400 text-slate-500 mt-1">
              تحكم في الأقسام والروابط التي تظهر في أسفل الصفحة
            </p>
          </div>
          <button onClick={load} className="w-8 h-8 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center dark:text-slate-400 text-slate-500 hover:text-violet-400 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {sections.map((section, si) => (
            <div key={section.key} className="rounded-xl border dark:border-white/10 border-slate-200 overflow-hidden">
              {/* Section header */}
              <div className="flex items-center gap-3 px-4 py-3 dark:bg-white/5 bg-slate-50 border-b dark:border-white/10 border-slate-100">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveSection(si, -1)} disabled={si === 0}
                    className="text-[10px] dark:text-slate-500 text-slate-300 hover:text-violet-400 disabled:opacity-30 transition-colors leading-none">▲</button>
                  <button onClick={() => moveSection(si, 1)} disabled={si === sections.length - 1}
                    className="text-[10px] dark:text-slate-500 text-slate-300 hover:text-violet-400 disabled:opacity-30 transition-colors leading-none">▼</button>
                </div>
                <GripVertical className="w-4 h-4 dark:text-slate-600 text-slate-300 flex-shrink-0" />
                {editingTitle === section.key ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input value={editTitleVal} onChange={e => setEditTitleVal(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveTitle(section.key); if (e.key === "Escape") setEditingTitle(null); }}
                      className="flex-1 px-2 py-1 text-sm rounded-lg dark:bg-white/10 bg-white border dark:border-violet-500/50 border-violet-300 dark:text-white text-slate-900 outline-none"
                      autoFocus />
                    <button onClick={() => saveTitle(section.key)} className="p-1 text-green-500 hover:text-green-400"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingTitle(null)} className="p-1 dark:text-slate-400 text-slate-500"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 font-semibold dark:text-white text-slate-800">{section.title}</span>
                    <button onClick={() => { setEditingTitle(section.key); setEditTitleVal(section.title); }}
                      className="p-1.5 rounded-lg dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500 hover:text-violet-400 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteSection(section.key)}
                      className="p-1.5 rounded-lg dark:bg-red-500/10 bg-red-50 text-red-400 hover:bg-red-500/20 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              {/* Links list */}
              <div className="p-3 space-y-1.5">
                <AnimatePresence>
                  {section.links.map((link, li) => (
                    <motion.div key={li} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg dark:bg-white/3 bg-slate-50 border dark:border-white/8 border-slate-100">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveLinkUp(section.key, li)} disabled={li === 0}
                          className="text-[9px] dark:text-slate-600 text-slate-300 hover:text-violet-400 disabled:opacity-30 leading-none">▲</button>
                        <button onClick={() => moveLinkDown(section.key, li)} disabled={li === section.links.length - 1}
                          className="text-[9px] dark:text-slate-600 text-slate-300 hover:text-violet-400 disabled:opacity-30 leading-none">▼</button>
                      </div>
                      <span className="flex-1 text-sm dark:text-slate-300 text-slate-700">{link.label}</span>
                      <span className="text-xs dark:text-slate-500 text-slate-400 font-mono" dir="ltr">{link.href}</span>
                      <button onClick={() => removeLink(section.key, li)}
                        className="p-1 rounded dark:text-slate-500 text-slate-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Add link for this section */}
                {addLinkSection === section.key ? (
                  <div className="mt-2 p-3 rounded-xl dark:bg-violet-500/5 bg-violet-50 border dark:border-violet-500/20 border-violet-100 space-y-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => setAddLinkMode("page")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${addLinkMode === "page" ? "bg-violet-500 text-white" : "dark:bg-white/5 bg-white dark:text-slate-300 text-slate-600 border dark:border-white/10 border-slate-200"}`}>
                        <FolderOpen className="w-3.5 h-3.5" /> ابحث عن صفحة
                      </button>
                      <button onClick={() => setAddLinkMode("custom")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${addLinkMode === "custom" ? "bg-violet-500 text-white" : "dark:bg-white/5 bg-white dark:text-slate-300 text-slate-600 border dark:border-white/10 border-slate-200"}`}>
                        <Link2 className="w-3.5 h-3.5" /> رابط مخصص
                      </button>
                    </div>

                    {addLinkMode === "page" ? (
                      <div>
                        <div className="relative mb-2">
                          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400 pointer-events-none" />
                          <input value={pageSearch} onChange={e => setPageSearch(e.target.value)}
                            placeholder="ابحث عن صفحة..."
                            className="w-full pr-8 pl-3 py-2 text-sm rounded-lg dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-violet-500" />
                        </div>
                        <div className="max-h-36 overflow-y-auto space-y-1">
                          {filteredPages.length === 0 ? (
                            <p className="text-xs dark:text-slate-500 text-slate-400 text-center py-3">لا توجد صفحات</p>
                          ) : filteredPages.map(p => (
                            <button key={p.id} onClick={() => addLink(section.key, { label: p.title, href: `/${p.slug}` })}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm dark:hover:bg-white/5 hover:bg-slate-100 transition-colors text-right">
                              <LayoutTemplate className="w-4 h-4 dark:text-slate-500 text-slate-400 flex-shrink-0" />
                              <span className="flex-1 dark:text-slate-200 text-slate-700">{p.title}</span>
                              <span className="text-xs dark:text-slate-600 text-slate-400 font-mono" dir="ltr">/{p.slug}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input value={customLabel} onChange={e => setCustomLabel(e.target.value)}
                          placeholder="اسم الرابط"
                          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-violet-500" />
                        <input value={customHref} onChange={e => setCustomHref(e.target.value)}
                          placeholder="/path أو https://..."
                          dir="ltr"
                          onKeyDown={e => { if (e.key === "Enter" && customLabel.trim() && customHref.trim()) addLink(section.key, { label: customLabel.trim(), href: customHref.trim() }); }}
                          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-violet-500 font-mono" />
                        <button
                          onClick={() => {
                            if (!customLabel.trim() || !customHref.trim()) { toast.error("أدخل الاسم والرابط"); return; }
                            addLink(section.key, { label: customLabel.trim(), href: customHref.trim() });
                          }}
                          className="w-full py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition-colors flex items-center justify-center gap-2">
                          <Plus className="w-4 h-4" /> إضافة
                        </button>
                      </div>
                    )}

                    <button onClick={() => { setAddLinkSection(null); setPageSearch(""); }}
                      className="w-full py-1.5 text-xs dark:text-slate-500 text-slate-400 hover:text-red-400 transition-colors">
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setAddLinkSection(section.key); setAddLinkMode("page"); }}
                    className="w-full py-2 rounded-lg border-2 border-dashed dark:border-white/10 border-slate-200 text-xs dark:text-slate-500 text-slate-400 hover:border-violet-500/50 hover:text-violet-400 transition-colors flex items-center justify-center gap-1.5 mt-2">
                    <Plus className="w-3.5 h-3.5" /> إضافة رابط
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add new section */}
          {addingSection ? (
            <div className="p-4 rounded-xl dark:bg-violet-500/5 bg-violet-50 border dark:border-violet-500/20 border-violet-100 flex gap-2">
              <input value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)}
                placeholder="اسم القسم الجديد"
                onKeyDown={e => { if (e.key === "Enter") addSection(); if (e.key === "Escape") setAddingSection(false); }}
                autoFocus
                className="flex-1 px-3 py-2 text-sm rounded-lg dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-violet-500" />
              <button onClick={addSection} className="px-3 py-2 rounded-lg bg-violet-500 text-white text-sm hover:bg-violet-600 transition-colors">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setAddingSection(false)} className="px-3 py-2 rounded-lg dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 text-sm hover:opacity-80 transition-opacity">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => setAddingSection(true)}
              className="w-full py-3 rounded-xl border-2 border-dashed dark:border-white/10 border-slate-200 text-sm dark:text-slate-500 text-slate-400 hover:border-violet-500/50 hover:text-violet-400 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> إضافة قسم جديد
            </button>
          )}
        </div>

        <button onClick={save} disabled={saving || loading}
          className="w-full py-3 rounded-xl gradient-bg text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ قوائم الفوتر
        </button>
      </div>
    </div>
  );
}

// ─── Navbar Editor (MenuEditor) ───────────────────────────────────────────────

function NavbarEditor() {
  const [items, setItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [newHref, setNewHref] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [pageSearch, setPageSearch] = useState("");
  const [addMode, setAddMode] = useState<"page" | "custom">("custom");
  const [showPagePicker, setShowPagePicker] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const [data, p] = await Promise.all([
        api.get<NavItem[]>("/admin/nav-items?type=navbar"),
        api.get<PageItem[]>("/admin/pages"),
      ]);
      setItems(data);
      setPages(p ?? []);
    } catch { toast.error("خطأ في تحميل القائمة"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const toggleVisibility = async (item: NavItem) => {
    const prev = items;
    setItems(i => i.map(x => x.id === item.id ? { ...x, isVisible: !x.isVisible } : x));
    try { await api.patch(`/admin/nav-items/${item.id}`, { isVisible: !item.isVisible }); }
    catch { setItems(prev); toast.error("خطأ في التحديث"); }
  };

  const removeItem = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الرابط؟")) return;
    const prev = items;
    setItems(i => i.filter(x => x.id !== id));
    try { await api.delete(`/admin/nav-items/${id}`); toast.success("تم الحذف"); }
    catch { setItems(prev); toast.error("خطأ في الحذف"); }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const n = [...items];
    [n[index], n[j]] = [n[j], n[index]];
    const reordered = n.map((item, i) => ({ ...item, order: i + 1 }));
    setItems(reordered);
    try { await api.put("/admin/nav-items/reorder", { items: reordered.map(({ id, order }) => ({ id, order })) }); }
    catch { setItems(items); toast.error("خطأ في الترتيب"); }
  };

  const addItem = async (label: string, href: string) => {
    if (!label.trim() || !href.trim()) { toast.error("أدخل الاسم والمسار"); return; }
    setAddLoading(true);
    try {
      const finalHref = href.trim().startsWith("/") || href.trim().startsWith("http") ? href.trim() : `/${href.trim()}`;
      const item = await api.post<NavItem>("/admin/nav-items", { type: "navbar", label: label.trim(), href: finalHref, isVisible: true, order: items.length + 1 });
      setItems(prev => [...prev, item]);
      setNewLabel(""); setNewHref("");
      setShowPagePicker(false); setPageSearch("");
      toast.success("تم إضافة الرابط");
    } catch (err) { toast.error(err instanceof Error ? err.message : "خطأ في الإضافة"); }
    finally { setAddLoading(false); }
  };

  const filteredPages = pages.filter(p => !pageSearch || p.title.toLowerCase().includes(pageSearch.toLowerCase()));

  return (
    <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold dark:text-white text-slate-900 flex items-center gap-2 text-lg">
            <Navigation className="w-5 h-5 text-cyan-400" />
            قائمة التنقل العلوية
          </h3>
          <p className="text-sm dark:text-slate-400 text-slate-500 mt-1">الروابط التي تظهر في شريط التنقل أعلى الصفحة</p>
        </div>
        <button onClick={fetchItems} className="w-8 h-8 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>
      ) : (
        <div className="space-y-2 mb-4">
          <AnimatePresence>
            {items.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${item.isVisible ? "dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200" : "dark:bg-white/2 bg-slate-50/50 dark:border-white/5 border-slate-100 opacity-60"}`}>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="text-[10px] dark:text-slate-500 text-slate-300 hover:text-cyan-400 disabled:opacity-30 transition-colors leading-none">▲</button>
                  <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-[10px] dark:text-slate-500 text-slate-300 hover:text-cyan-400 disabled:opacity-30 transition-colors leading-none">▼</button>
                </div>
                <GripVertical className="w-4 h-4 dark:text-slate-600 text-slate-300 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium dark:text-white text-slate-800">{item.label}</p>
                  <p className="text-xs dark:text-slate-500 text-slate-400 font-mono" dir="ltr">{item.href}</p>
                </div>
                <button onClick={() => toggleVisibility(item)} title={item.isVisible ? "إخفاء" : "إظهار"}
                  className={`p-1.5 rounded-lg transition-colors ${item.isVisible ? "dark:bg-green-500/10 bg-green-50 text-green-500 hover:bg-green-500/20" : "dark:bg-white/5 bg-slate-100 dark:text-slate-500 text-slate-400"}`}>
                  {item.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => removeItem(item.id)}
                  className="p-1.5 rounded-lg dark:bg-red-500/10 bg-red-50 text-red-400 hover:bg-red-500/20 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {items.length === 0 && <p className="text-center text-sm dark:text-slate-500 text-slate-400 py-4">لا توجد روابط — أضف رابطاً أدناه</p>}
        </div>
      )}

      {/* Add link form */}
      <div className="p-3 rounded-xl dark:bg-cyan-500/5 bg-cyan-50 border dark:border-cyan-500/20 border-cyan-100 space-y-3">
        <div className="flex gap-1.5">
          <button onClick={() => setAddMode("custom")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${addMode === "custom" ? "bg-cyan-500 text-white" : "dark:bg-white/5 bg-white dark:text-slate-300 text-slate-600 border dark:border-white/10 border-slate-200"}`}>
            <Link2 className="w-3.5 h-3.5" /> رابط مخصص
          </button>
          <button onClick={() => setAddMode("page")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${addMode === "page" ? "bg-cyan-500 text-white" : "dark:bg-white/5 bg-white dark:text-slate-300 text-slate-600 border dark:border-white/10 border-slate-200"}`}>
            <FolderOpen className="w-3.5 h-3.5" /> من الصفحات
          </button>
        </div>

        {addMode === "custom" ? (
          <div className="flex gap-2">
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="اسم الرابط"
              className="flex-1 px-3 py-2 text-sm rounded-lg dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500" />
            <input value={newHref} onChange={e => setNewHref(e.target.value)} placeholder="/path" dir="ltr"
              onKeyDown={e => e.key === "Enter" && addItem(newLabel, newHref)}
              className="w-28 px-3 py-2 text-sm rounded-lg dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 font-mono" />
            <button onClick={() => addItem(newLabel, newHref)} disabled={addLoading}
              className="px-3 py-2 rounded-lg gradient-bg text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60">
              {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <div>
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400 pointer-events-none" />
              <input value={pageSearch} onChange={e => setPageSearch(e.target.value)} placeholder="ابحث عن صفحة..."
                className="w-full pr-8 pl-3 py-2 text-sm rounded-lg dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500" />
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {filteredPages.length === 0 ? (
                <p className="text-xs dark:text-slate-500 text-slate-400 text-center py-3">لا توجد صفحات</p>
              ) : filteredPages.map(p => (
                <button key={p.id} onClick={() => addItem(p.title, `/${p.slug}`)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm dark:hover:bg-white/5 hover:bg-slate-100 transition-colors text-right">
                  <LayoutTemplate className="w-4 h-4 dark:text-slate-500 text-slate-400 flex-shrink-0" />
                  <span className="flex-1 dark:text-slate-200 text-slate-700">{p.title}</span>
                  {addLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI Settings ──────────────────────────────────────────────────────────────

const PROVIDER_PRESETS = [
  { label: "Groq (مجاني وسريع)", baseUrl: "https://api.groq.com/openai/v1", defaultModel: "llama-3.3-70b-versatile", link: "https://console.groq.com/keys" },
  { label: "OpenAI", baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o-mini", link: "https://platform.openai.com/api-keys" },
  { label: "مخصص", baseUrl: "", defaultModel: "", link: "" },
];

function AiSettingsSection() {
  const [status, setStatus] = useState<{ hasKey: boolean; maskedKey: string; baseUrl: string; model: string; provider: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.groq.com/openai/v1");
  const [model, setModel] = useState("llama-3.3-70b-versatile");
  const [showKey, setShowKey] = useState(false);
  const [preset, setPreset] = useState(0);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<typeof status>("/admin/settings/ai");
      setStatus(data);
      if (data?.baseUrl) setBaseUrl(data.baseUrl);
      if (data?.model) setModel(data.model);
    } catch { toast.error("تعذّر تحميل إعدادات الذكاء الاصطناعي"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handlePreset = (idx: number) => {
    setPreset(idx);
    const p = PROVIDER_PRESETS[idx];
    if (p.baseUrl) setBaseUrl(p.baseUrl);
    if (p.defaultModel) setModel(p.defaultModel);
  };

  const save = async () => {
    if (!apiKey.trim()) { toast.error("أدخل الـ API key"); return; }
    setSaving(true);
    try {
      await api.post("/admin/settings/ai", { apiKey: apiKey.trim(), baseUrl, model });
      toast.success("تم حفظ إعدادات الذكاء الاصطناعي");
      setApiKey(""); setShowForm(false); await fetchStatus();
    } catch { toast.error("حدث خطأ في الحفظ"); }
    finally { setSaving(false); }
  };

  const removeKey = async () => {
    if (!confirm("هل تريد حذف الـ API key؟ لن تعمل ميزات الذكاء الاصطناعي.")) return;
    setDeleting(true);
    try {
      await api.delete("/admin/settings/ai");
      toast.success("تم حذف الـ API key");
      await fetchStatus();
    } catch { toast.error("حدث خطأ في الحذف"); }
    finally { setDeleting(false); }
  };

  return (
    <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold dark:text-white text-slate-900 flex items-center gap-2 text-lg">
            <Bot className="w-5 h-5 text-amber-400" />
            إعدادات الذكاء الاصطناعي
          </h3>
          <p className="text-sm dark:text-slate-400 text-slate-500 mt-1">مزود الذكاء الاصطناعي لاقتراحات SEO وتحليل المحتوى</p>
        </div>
        <button onClick={fetchStatus} className="w-8 h-8 rounded-lg dark:bg-white/5 bg-slate-100 flex items-center justify-center dark:text-slate-400 text-slate-500 hover:text-amber-400 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-amber-400 animate-spin" /></div>
      ) : (
        <>
          <div className={`flex items-center gap-3 p-4 rounded-xl mb-4 border ${status?.hasKey ? "dark:bg-green-500/10 bg-green-50 dark:border-green-500/20 border-green-200" : "dark:bg-amber-500/10 bg-amber-50 dark:border-amber-500/20 border-amber-200"}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${status?.hasKey ? "bg-green-500/20" : "bg-amber-500/20"}`}>
              {status?.hasKey ? <Check className="w-5 h-5 text-green-500" /> : <X className="w-5 h-5 text-amber-500" />}
            </div>
            <div className="flex-1">
              <p className={`font-semibold text-sm ${status?.hasKey ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                {status?.hasKey ? "الذكاء الاصطناعي مُفعَّل" : "لا يوجد API key"}
              </p>
              {status?.hasKey ? (
                <p className="text-xs dark:text-slate-400 text-slate-500 font-mono mt-0.5" dir="ltr">{status.maskedKey} · {status.model || "llama-3.3-70b-versatile"}</p>
              ) : (
                <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5">أضف Groq API key للحصول على اقتراحات SEO ذكية</p>
              )}
            </div>
            {status?.hasKey && (
              <button onClick={removeKey} disabled={deleting}
                className="px-3 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "حذف"}
              </button>
            )}
          </div>

          {!showForm ? (
            <button onClick={() => setShowForm(true)}
              className="w-full py-2.5 rounded-xl border-2 border-dashed dark:border-white/10 border-slate-200 text-sm dark:text-slate-400 text-slate-500 hover:border-amber-500/50 hover:text-amber-400 transition-colors flex items-center justify-center gap-2">
              <Key className="w-4 h-4" />
              {status?.hasKey ? "تغيير الـ API key" : "إضافة API key"}
            </button>
          ) : (
            <div className="space-y-3 p-4 rounded-xl dark:bg-amber-500/5 bg-amber-50 border dark:border-amber-500/20 border-amber-100">
              <div>
                <p className="text-xs font-medium dark:text-slate-400 text-slate-500 mb-2">المزوّد</p>
                <div className="flex flex-wrap gap-2">
                  {PROVIDER_PRESETS.map((p, i) => (
                    <button key={i} onClick={() => handlePreset(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${preset === i ? "bg-amber-500 text-white" : "dark:bg-white/5 bg-white dark:text-slate-300 text-slate-600 hover:bg-amber-500/20 border dark:border-white/10 border-slate-200"}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                {PROVIDER_PRESETS[preset]?.link && (
                  <a href={PROVIDER_PRESETS[preset].link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline mt-1.5">
                    <ExternalLink className="w-3 h-3" /> احصل على API key مجاني
                  </a>
                )}
              </div>
              <div>
                <p className="text-xs font-medium dark:text-slate-400 text-slate-500 mb-1.5 flex items-center gap-1"><Key className="w-3 h-3" /> API Key</p>
                <div className="relative">
                  <input type={showKey ? "text" : "password"} value={apiKey} onChange={e => setApiKey(e.target.value)}
                    placeholder="gsk_..." dir="ltr"
                    className="w-full px-3 py-2 pr-10 text-sm rounded-lg dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-amber-500 font-mono" />
                  <button onClick={() => setShowKey(v => !v)} className="absolute left-2.5 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400">
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium dark:text-slate-400 text-slate-500 mb-1.5 flex items-center gap-1"><Cpu className="w-3 h-3" /> الموديل</p>
                <input type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="llama-3.3-70b-versatile" dir="ltr"
                  className="w-full px-3 py-2 text-sm rounded-lg dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-amber-500 font-mono" />
              </div>
              <div>
                <p className="text-xs font-medium dark:text-slate-400 text-slate-500 mb-1.5 flex items-center gap-1"><Zap className="w-3 h-3" /> Base URL</p>
                <input type="text" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} dir="ltr"
                  className="w-full px-3 py-2 text-sm rounded-lg dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-amber-500 font-mono" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={save} disabled={saving}
                  className="flex-1 py-2 rounded-lg gradient-bg text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} حفظ
                </button>
                <button onClick={() => { setShowForm(false); setApiKey(""); }}
                  className="px-4 py-2 rounded-lg dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 text-sm hover:opacity-80 transition-opacity">
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>("pages");

  return (
    <AdminSectionGuard section="settings">
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Settings className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-black dark:text-white text-slate-900">الإعدادات</h1>
          </div>
          <p className="dark:text-slate-400 text-slate-500 text-sm">
            تحكم في الصفحات والقوائم وإعدادات الموقع
          </p>
        </div>

        <TabBar tab={tab} setTab={setTab} />

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            {tab === "pages"  && <PageRoutesEditor />}
            {tab === "footer" && <FooterMenusEditor />}
            {tab === "navbar" && <NavbarEditor />}
            {tab === "ai"     && <AiSettingsSection />}
          </motion.div>
        </AnimatePresence>
      </div>
    </AdminSectionGuard>
  );
}
