"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit2, Globe, BookOpen, FileText,
  Eye, EyeOff, Save, X, Loader2, Code2, GraduationCap,
  ChevronRight, ChevronDown, Tag, ExternalLink, Hash,
  AlignLeft, Layers, AlertCircle, CheckCircle2, ArrowRight,
} from "lucide-react";

interface Language {
  id: number;
  slug: string;
  nameAr: string;
  nameEn: string;
  icon: string | null;
  color: string;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  order: number;
  isPublished: boolean;
  topicsCount: number;
  chaptersCount: number;
}

interface Chapter {
  id: number;
  languageId: number;
  slug: string;
  titleAr: string;
  order: number;
}

interface Topic {
  id: number;
  languageId: number;
  chapterId: number | null;
  slug: string;
  titleAr: string;
  conceptExplanationAr: string;
  syntaxCode: string | null;
  codeExamples: Array<{ title: string; code: string; language: string }>;
  proTipsAr: string | null;
  seoKeywords: string[];
  order: number;
  isPublished: boolean;
}

type Panel = "langs" | "content" | "topic-edit" | "lang-edit" | "chapter-edit";

const DEFAULT_LANG = {
  slug: "", nameAr: "", nameEn: "", icon: "", color: "#06b6d4",
  description: "", metaTitle: "", metaDescription: "", order: 0, isPublished: true,
};
const DEFAULT_CHAPTER = { slug: "", titleAr: "", order: 0, languageId: 0 };
const DEFAULT_TOPIC = {
  slug: "", titleAr: "", conceptExplanationAr: "", syntaxCode: "",
  codeExamples: [] as Topic["codeExamples"], proTipsAr: "", seoKeywords: [] as string[],
  order: 0, isPublished: true, chapterId: null as number | null, languageId: 0,
};

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\u0600-\u06FF\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const inp = "w-full dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 rounded-xl px-3 py-2.5 text-sm dark:text-white text-slate-900 dark:placeholder:text-white/30 placeholder:text-slate-400 focus:outline-none dark:focus:border-cyan-500/60 focus:border-cyan-500/60 transition-colors";

async function revalidateSchool() {
  try { await fetch("/revalidate/school", { method: "POST" }); } catch { /* silent */ }
}

export default function AdminSchoolPage() {
  const [languages, setLanguages]       = useState<Language[]>([]);
  const [selectedLang, setSelectedLang] = useState<Language | null>(null);
  const [chapters, setChapters]         = useState<Chapter[]>([]);
  const [topics, setTopics]             = useState<Topic[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [panel, setPanel]               = useState<Panel>("langs");
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());

  const [editingLangId, setEditingLangId]       = useState<number | null>(null);
  const [editingChapterId, setEditingChapterId] = useState<number | null>(null);
  const [editingTopicId, setEditingTopicId]     = useState<number | null>(null);

  const [langForm, setLangForm]       = useState(DEFAULT_LANG);
  const [chapterForm, setChapterForm] = useState(DEFAULT_CHAPTER);
  const [topicForm, setTopicForm]     = useState(DEFAULT_TOPIC);

  const [seoKwInput, setSeoKwInput] = useState("");
  const [codeEx, setCodeEx]         = useState({ title: "", code: "", language: "html" });

  const langSlugManual    = useRef(false);
  const chapterSlugManual = useRef(false);
  const topicSlugManual   = useRef(false);

  const loadLanguages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Language[]>("/admin/school/languages");
      setLanguages(data);
    } catch { toast.error("فشل تحميل اللغات"); }
    setLoading(false);
  }, []);

  useEffect(() => { loadLanguages(); }, [loadLanguages]);

  const loadLangDetail = useCallback(async (lang: Language) => {
    setSelectedLang(lang);
    try {
      const [chs, tops] = await Promise.all([
        api.get<Chapter[]>(`/admin/school/languages/${lang.id}/chapters`),
        api.get<Topic[]>(`/admin/school/topics?langId=${lang.id}`),
      ]);
      setChapters(chs);
      setTopics(tops);
      setExpandedChapters(new Set(chs.map((c) => c.id)));
    } catch { toast.error("فشل تحميل البيانات"); }
  }, []);

  const openLangEdit = (lang?: Language) => {
    if (lang) {
      setEditingLangId(lang.id);
      setLangForm({ slug: lang.slug, nameAr: lang.nameAr, nameEn: lang.nameEn, icon: lang.icon ?? "", color: lang.color, description: lang.description ?? "", metaTitle: lang.metaTitle ?? "", metaDescription: lang.metaDescription ?? "", order: lang.order, isPublished: lang.isPublished });
      langSlugManual.current = true;
    } else {
      setEditingLangId(null);
      setLangForm(DEFAULT_LANG);
      langSlugManual.current = false;
    }
    setPanel("lang-edit");
  };

  const openChapterEdit = (ch?: Chapter) => {
    if (ch) {
      setEditingChapterId(ch.id);
      setChapterForm({ slug: ch.slug, titleAr: ch.titleAr, order: ch.order, languageId: ch.languageId });
      chapterSlugManual.current = true;
    } else {
      setEditingChapterId(null);
      setChapterForm({ ...DEFAULT_CHAPTER, languageId: selectedLang?.id ?? 0 });
      chapterSlugManual.current = false;
    }
    setPanel("chapter-edit");
  };

  const openTopicEdit = (t?: Topic) => {
    if (t) {
      setEditingTopicId(t.id);
      setTopicForm({ slug: t.slug, titleAr: t.titleAr, conceptExplanationAr: t.conceptExplanationAr, syntaxCode: t.syntaxCode ?? "", codeExamples: t.codeExamples, proTipsAr: t.proTipsAr ?? "", seoKeywords: t.seoKeywords, order: t.order, isPublished: t.isPublished, chapterId: t.chapterId, languageId: t.languageId });
      topicSlugManual.current = true;
    } else {
      setEditingTopicId(null);
      setTopicForm({ ...DEFAULT_TOPIC, languageId: selectedLang?.id ?? 0 });
      topicSlugManual.current = false;
    }
    setSeoKwInput("");
    setCodeEx({ title: "", code: "", language: "html" });
    setPanel("topic-edit");
  };

  const saveLang = async () => {
    if (!langForm.slug || !langForm.nameAr || !langForm.nameEn) { toast.error("Slug والاسمان مطلوبان"); return; }
    setSaving(true);
    try {
      if (editingLangId) await api.put(`/admin/school/languages/${editingLangId}`, langForm);
      else await api.post("/admin/school/languages", langForm);
      toast.success("تم الحفظ");
      await revalidateSchool();
      await loadLanguages();
      setPanel("langs");
    } catch { toast.error("فشل الحفظ"); }
    setSaving(false);
  };

  const saveChapter = async () => {
    if (!chapterForm.slug || !chapterForm.titleAr) { toast.error("الـ Slug والعنوان مطلوبان"); return; }
    setSaving(true);
    try {
      if (editingChapterId) await api.put(`/admin/school/chapters/${editingChapterId}`, chapterForm);
      else await api.post("/admin/school/chapters", chapterForm);
      toast.success("تم الحفظ");
      await revalidateSchool();
      if (selectedLang) await loadLangDetail(selectedLang);
      setPanel("content");
    } catch { toast.error("فشل الحفظ"); }
    setSaving(false);
  };

  const saveTopic = async () => {
    if (!topicForm.slug || !topicForm.titleAr) { toast.error("الـ Slug والعنوان مطلوبان"); return; }
    setSaving(true);
    try {
      if (editingTopicId) await api.put(`/admin/school/topics/${editingTopicId}`, topicForm);
      else await api.post("/admin/school/topics", topicForm);
      toast.success("تم الحفظ");
      await revalidateSchool();
      if (selectedLang) await loadLangDetail(selectedLang);
      setPanel("content");
    } catch { toast.error("فشل الحفظ"); }
    setSaving(false);
  };

  const deleteLang = async (id: number) => {
    if (!confirm("حذف هذه اللغة وكل محتواها؟")) return;
    try {
      await api.delete(`/admin/school/languages/${id}`);
      toast.success("تم الحذف");
      revalidateSchool();
      loadLanguages();
      if (selectedLang?.id === id) { setSelectedLang(null); setPanel("langs"); }
    }
    catch { toast.error("فشل الحذف"); }
  };

  const deleteChapter = async (id: number) => {
    if (!confirm("حذف هذا الفصل؟")) return;
    try {
      await api.delete(`/admin/school/chapters/${id}`);
      toast.success("تم الحذف");
      revalidateSchool();
      if (selectedLang) loadLangDetail(selectedLang);
    }
    catch { toast.error("فشل الحذف"); }
  };

  const deleteTopic = async (id: number) => {
    if (!confirm("حذف هذا الموضوع؟")) return;
    try {
      await api.delete(`/admin/school/topics/${id}`);
      toast.success("تم الحذف");
      revalidateSchool();
      if (selectedLang) loadLangDetail(selectedLang);
    }
    catch { toast.error("فشل الحذف"); }
  };

  const addKeyword = () => {
    const kw = seoKwInput.trim();
    if (!kw || topicForm.seoKeywords.includes(kw)) return;
    setTopicForm((p) => ({ ...p, seoKeywords: [...p.seoKeywords, kw] }));
    setSeoKwInput("");
  };

  const addCodeExample = () => {
    if (!codeEx.code.trim()) { toast.error("الكود مطلوب"); return; }
    setTopicForm((p) => ({ ...p, codeExamples: [...p.codeExamples, { ...codeEx }] }));
    setCodeEx({ title: "", code: "", language: "html" });
  };

  const toggleChapter = (id: number) => setExpandedChapters((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const LANG_COLORS: Record<string, string> = {
    html: "#e44d26", css: "#264de4", javascript: "#f7df1e", python: "#3776ab", react: "#61dafb",
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-cyan-400" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 dark:border-white/10 border-slate-200 border flex items-center justify-center">
              <GraduationCap size={20} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold dark:text-white text-slate-900">مدرسة البرمجة</h1>
              <p className="text-xs dark:text-white/40 text-slate-500">إدارة لغات البرمجة والفصول والمواضيع</p>
            </div>
          </div>
          {(panel === "langs" || panel === "content") && (
            <button
              onClick={() => openLangEdit()}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-violet-500 hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-medium transition-opacity"
            >
              <Plus size={15} /> لغة جديدة
            </button>
          )}
        </div>

        {/* Breadcrumb */}
        {panel !== "langs" && (
          <div className="flex items-center gap-2 text-xs dark:text-white/40 text-slate-500">
            <button onClick={() => setPanel("langs")} className="hover:text-cyan-400 transition-colors">اللغات</button>
            {selectedLang && (
              <>
                <ChevronRight size={12} className="rotate-180" />
                <button onClick={() => setPanel("content")} className="hover:text-cyan-400 transition-colors">{selectedLang.nameAr}</button>
              </>
            )}
            {(panel === "topic-edit" || panel === "chapter-edit" || panel === "lang-edit") && (
              <>
                <ChevronRight size={12} className="rotate-180" />
                <span className="dark:text-white/60 text-slate-600">
                  {panel === "topic-edit" ? (editingTopicId ? "تعديل موضوع" : "موضوع جديد") :
                    panel === "chapter-edit" ? (editingChapterId ? "تعديل فصل" : "فصل جديد") :
                      (editingLangId ? "تعديل لغة" : "لغة جديدة")}
                </span>
              </>
            )}
          </div>
        )}

        {/* ── Panel: Languages List ── */}
        {panel === "langs" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {languages.length === 0 && (
              <div className="col-span-3 flex flex-col items-center justify-center py-16 border border-dashed dark:border-white/10 border-slate-200 rounded-2xl dark:text-white/30 text-slate-400">
                <GraduationCap size={40} className="mb-3 opacity-40" />
                <p className="text-sm">لا توجد لغات بعد — أضف أول لغة</p>
              </div>
            )}
            {languages.map((lang) => {
              const accent = LANG_COLORS[lang.slug] ?? lang.color;
              return (
                <div
                  key={lang.id}
                  className="group relative dark:bg-white/5 bg-white backdrop-blur-sm dark:border-white/10 border-slate-200 border hover:dark:border-white/20 hover:border-slate-300 rounded-2xl p-5 cursor-pointer transition-all hover:dark:bg-white/[0.07] hover:bg-slate-50"
                  onClick={() => { loadLangDetail(lang); setPanel("content"); }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}>
                        <span style={{ color: accent }}>{lang.nameEn.slice(0, 3).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-semibold dark:text-white text-slate-900">{lang.nameAr}</p>
                        <p className="text-xs dark:text-white/40 text-slate-500">{lang.nameEn}</p>
                      </div>
                    </div>
                    {!lang.isPublished && <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">مخفية</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs dark:text-white/40 text-slate-500 mb-4">
                    <span className="flex items-center gap-1"><BookOpen size={11} /> {lang.chaptersCount} فصل</span>
                    <span className="flex items-center gap-1"><FileText size={11} /> {lang.topicsCount} موضوع</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <a href={`/learn/${lang.slug}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs dark:text-white/30 text-slate-400 hover:text-cyan-500 flex items-center gap-1 transition-colors">
                      <ExternalLink size={11} /> معاينة
                    </a>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); openLangEdit(lang); }} className="p-1.5 rounded-lg dark:bg-white/5 bg-slate-100 dark:hover:bg-white/10 hover:bg-slate-200 dark:text-white/60 text-slate-500 hover:dark:text-white hover:text-slate-900 transition-colors"><Edit2 size={13} /></button>
                      <button onClick={(e) => { e.stopPropagation(); deleteLang(lang.id); }} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Panel: Language Content (Chapters + Topics) ── */}
        {panel === "content" && selectedLang && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: chapters tree */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold dark:text-white/70 text-slate-600 flex items-center gap-2">
                  <Layers size={14} className="text-cyan-400" /> الفصول والمواضيع
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => openChapterEdit()} className="flex items-center gap-1.5 text-xs dark:bg-white/5 bg-slate-100 dark:hover:bg-white/10 hover:bg-slate-200 dark:border-white/10 border-slate-200 border px-3 py-1.5 rounded-lg dark:text-white/70 text-slate-600 hover:dark:text-white hover:text-slate-900 transition-colors">
                    <Plus size={12} /> فصل
                  </button>
                  <button onClick={() => openTopicEdit()} className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-cyan-500/80 to-violet-500/80 hover:opacity-90 text-white px-3 py-1.5 rounded-lg transition-opacity">
                    <Plus size={12} /> موضوع
                  </button>
                </div>
              </div>

              {chapters.length === 0 && topics.length === 0 && (
                <div className="flex flex-col items-center justify-center py-14 border border-dashed dark:border-white/10 border-slate-200 rounded-2xl dark:text-white/30 text-slate-400">
                  <BookOpen size={32} className="mb-3 opacity-40" />
                  <p className="text-sm">لا محتوى بعد — أضف فصلاً أو موضوعاً</p>
                </div>
              )}

              {chapters.map((ch) => {
                const chTopics = topics.filter((t) => t.chapterId === ch.id);
                const isOpen = expandedChapters.has(ch.id);
                return (
                  <div key={ch.id} className="dark:bg-white/[0.04] bg-white dark:border-white/10 border-slate-200 border rounded-2xl overflow-hidden">
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer dark:hover:bg-white/[0.03] hover:bg-slate-50 transition-colors"
                      onClick={() => toggleChapter(ch.id)}
                    >
                      <div className="flex items-center gap-2">
                        {isOpen ? <ChevronDown size={14} className="dark:text-white/40 text-slate-400" /> : <ChevronRight size={14} className="dark:text-white/40 text-slate-400 rotate-180" />}
                        <span className="font-medium text-sm dark:text-white text-slate-900">{ch.titleAr}</span>
                        <span className="text-xs dark:text-white/30 text-slate-400 dark:bg-white/5 bg-slate-100 px-1.5 py-0.5 rounded-full">{chTopics.length}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={(e) => { e.stopPropagation(); openChapterEdit(ch); }} className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 dark:text-white/40 text-slate-400 hover:dark:text-white hover:text-slate-900 transition-colors"><Edit2 size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteChapter(ch.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 dark:text-white/40 text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="dark:border-t dark:border-white/5 border-t border-slate-100">
                        {chTopics.length === 0 && (
                          <div className="px-6 py-4 text-xs dark:text-white/25 text-slate-400 text-center">لا مواضيع في هذا الفصل بعد</div>
                        )}
                        {chTopics.map((t) => (
                          <div key={t.id} className="flex items-center justify-between px-6 py-2.5 border-b dark:border-white/[0.04] border-slate-100 last:border-0 dark:hover:bg-white/[0.02] hover:bg-slate-50 group/topic">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.isPublished ? "bg-emerald-400" : "bg-amber-400"}`} />
                              <span className="text-sm dark:text-white/80 text-slate-700 truncate">{t.titleAr}</span>
                              <span className="text-xs dark:text-white/25 text-slate-400 font-mono truncate">/{t.slug}</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover/topic:opacity-100 transition-opacity flex-shrink-0">
                              <a href={`/learn/${selectedLang.slug}/${t.slug}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 dark:text-white/40 text-slate-400 hover:text-cyan-500 transition-colors"><ExternalLink size={11} /></a>
                              <button onClick={() => openTopicEdit(t)} className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 dark:text-white/40 text-slate-400 hover:dark:text-white hover:text-slate-900 transition-colors"><Edit2 size={12} /></button>
                              <button onClick={() => deleteTopic(t.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 dark:text-white/40 text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => openTopicEdit()}
                          className="w-full text-xs dark:text-white/25 text-slate-400 hover:text-cyan-500 py-2.5 text-center dark:hover:bg-white/[0.02] hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus size={11} /> إضافة موضوع في هذا الفصل
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Uncategorized */}
              {topics.filter((t) => !t.chapterId).length > 0 && (
                <div className="dark:bg-white/[0.04] bg-white border border-dashed dark:border-white/10 border-slate-200 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b dark:border-white/5 border-slate-100">
                    <Hash size={13} className="dark:text-white/30 text-slate-400" />
                    <span className="text-sm dark:text-white/40 text-slate-500">بدون فصل</span>
                    <span className="text-xs dark:text-white/20 text-slate-400 dark:bg-white/5 bg-slate-100 px-1.5 py-0.5 rounded-full">{topics.filter((t) => !t.chapterId).length}</span>
                  </div>
                  {topics.filter((t) => !t.chapterId).map((t) => (
                    <div key={t.id} className="flex items-center justify-between px-6 py-2.5 border-b dark:border-white/[0.04] border-slate-100 last:border-0 dark:hover:bg-white/[0.02] hover:bg-slate-50 group/topic">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.isPublished ? "bg-emerald-400" : "bg-amber-400"}`} />
                        <span className="text-sm dark:text-white/80 text-slate-700 truncate">{t.titleAr}</span>
                        <span className="text-xs dark:text-white/25 text-slate-400 font-mono truncate">/{t.slug}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover/topic:opacity-100 transition-opacity flex-shrink-0">
                        <a href={`/learn/${selectedLang.slug}/${t.slug}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 dark:text-white/40 text-slate-400 hover:text-cyan-500 transition-colors"><ExternalLink size={11} /></a>
                        <button onClick={() => openTopicEdit(t)} className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 dark:text-white/40 text-slate-400 hover:dark:text-white hover:text-slate-900 transition-colors"><Edit2 size={12} /></button>
                        <button onClick={() => deleteTopic(t.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 dark:text-white/40 text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Language info card */}
            <div className="space-y-4">
              {(() => {
                const accent = LANG_COLORS[selectedLang.slug] ?? selectedLang.color;
                return (
                  <div className="dark:bg-white/[0.04] bg-white dark:border-white/10 border-slate-200 border rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}>
                        <span style={{ color: accent }}>{selectedLang.nameEn.slice(0, 3).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-semibold dark:text-white text-slate-900">{selectedLang.nameAr}</p>
                        <p className="text-xs dark:text-white/40 text-slate-500">/{selectedLang.slug}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="dark:bg-white/5 bg-slate-100 rounded-lg p-2.5 text-center">
                        <p className="dark:text-white text-slate-900 font-semibold text-lg">{selectedLang.chaptersCount}</p>
                        <p className="dark:text-white/40 text-slate-500">فصل</p>
                      </div>
                      <div className="dark:bg-white/5 bg-slate-100 rounded-lg p-2.5 text-center">
                        <p className="dark:text-white text-slate-900 font-semibold text-lg">{selectedLang.topicsCount}</p>
                        <p className="dark:text-white/40 text-slate-500">موضوع</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="dark:text-white/40 text-slate-500">الحالة</span>
                      <span className={`flex items-center gap-1 ${selectedLang.isPublished ? "text-emerald-500 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {selectedLang.isPublished ? <><CheckCircle2 size={11} /> منشورة</> : <><EyeOff size={11} /> مخفية</>}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 pt-1 border-t dark:border-white/5 border-slate-100">
                      <button onClick={() => openLangEdit(selectedLang)} className="w-full flex items-center justify-center gap-2 text-xs dark:bg-white/5 bg-slate-100 dark:hover:bg-white/10 hover:bg-slate-200 dark:border-white/10 border-slate-200 border rounded-xl py-2 dark:text-white/70 text-slate-600 hover:dark:text-white hover:text-slate-900 transition-colors">
                        <Edit2 size={12} /> تعديل اللغة
                      </button>
                      <a href={`/learn/${selectedLang.slug}`} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 text-xs bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl py-2 text-cyan-500 dark:text-cyan-400 transition-colors">
                        <ExternalLink size={12} /> معاينة الصفحة
                      </a>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── Panel: Language Edit Form ── */}
        {panel === "lang-edit" && (
          <div className="max-w-2xl mx-auto dark:bg-white/[0.04] bg-white dark:border-white/10 border-slate-200 border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b dark:border-white/10 border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold dark:text-white text-slate-900 flex items-center gap-2">
                <Globe size={16} className="text-cyan-400" />
                {editingLangId ? "تعديل لغة" : "إضافة لغة جديدة"}
              </h3>
              <button onClick={() => setPanel(editingLangId && selectedLang ? "content" : "langs")} className="dark:text-white/40 text-slate-400 hover:dark:text-white hover:text-slate-900 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs dark:text-white/50 text-slate-500 mb-1.5 block">Slug <span className="text-red-400">*</span></label>
                  <input className={inp} placeholder="html" value={langForm.slug}
                    onChange={(e) => { langSlugManual.current = true; setLangForm((p) => ({ ...p, slug: e.target.value })); }} />
                </div>
                <div>
                  <label className="text-xs dark:text-white/50 text-slate-500 mb-1.5 block">الاسم بالإنجليزية <span className="text-red-400">*</span></label>
                  <input className={inp} placeholder="HTML"
                    value={langForm.nameEn}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLangForm((p) => ({ ...p, nameEn: v, slug: langSlugManual.current ? p.slug : v.toLowerCase().replace(/\s+/g, "-") }));
                    }} />
                </div>
              </div>
              <div>
                <label className="text-xs dark:text-white/50 text-slate-500 mb-1.5 block">الاسم بالعربية <span className="text-red-400">*</span></label>
                <input className={inp} placeholder="لغة HTML" value={langForm.nameAr} onChange={(e) => setLangForm((p) => ({ ...p, nameAr: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs dark:text-white/50 text-slate-500 mb-1.5 block">اللون الرئيسي</label>
                  <div className="flex gap-2">
                    <input type="color" className="h-[42px] w-12 rounded-xl border dark:border-white/10 border-slate-200 bg-transparent cursor-pointer" value={langForm.color} onChange={(e) => setLangForm((p) => ({ ...p, color: e.target.value }))} />
                    <input className={inp} placeholder="#3b82f6" value={langForm.color} onChange={(e) => setLangForm((p) => ({ ...p, color: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs dark:text-white/50 text-slate-500 mb-1.5 block">الترتيب</label>
                  <input type="number" className={inp} value={langForm.order} onChange={(e) => setLangForm((p) => ({ ...p, order: +e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs dark:text-white/50 text-slate-500 mb-1.5 block">الوصف المختصر</label>
                <textarea className={inp} rows={2} placeholder="وصف مختصر للغة..." value={langForm.description} onChange={(e) => setLangForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 gap-4 border-t dark:border-white/5 border-slate-100 pt-4">
                <p className="text-xs dark:text-white/30 text-slate-400 uppercase tracking-wider">SEO</p>
                <div>
                  <label className="text-xs dark:text-white/50 text-slate-500 mb-1.5 block">Meta Title</label>
                  <input className={inp} value={langForm.metaTitle} onChange={(e) => setLangForm((p) => ({ ...p, metaTitle: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs dark:text-white/50 text-slate-500 mb-1.5 block">Meta Description</label>
                  <textarea className={inp} rows={2} value={langForm.metaDescription} onChange={(e) => setLangForm((p) => ({ ...p, metaDescription: e.target.value }))} />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer py-2">
                <div className={`w-10 h-5 rounded-full transition-colors relative ${langForm.isPublished ? "bg-emerald-500" : "dark:bg-white/10 bg-slate-200"}`} onClick={() => setLangForm((p) => ({ ...p, isPublished: !p.isPublished }))}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${langForm.isPublished ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                <span className="text-sm dark:text-white/70 text-slate-600">منشورة وظاهرة للمستخدمين</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t dark:border-white/10 border-slate-200 flex items-center justify-end gap-3">
              <button onClick={() => setPanel(editingLangId && selectedLang ? "content" : "langs")} className="px-4 py-2 text-sm dark:text-white/50 text-slate-500 hover:dark:text-white hover:text-slate-900 border dark:border-white/10 border-slate-200 rounded-xl transition-colors">إلغاء</button>
              <button onClick={saveLang} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-500 to-violet-500 hover:opacity-90 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-opacity">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} حفظ
              </button>
            </div>
          </div>
        )}

        {/* ── Panel: Chapter Edit Form ── */}
        {panel === "chapter-edit" && (
          <div className="max-w-lg mx-auto dark:bg-white/[0.04] bg-white dark:border-white/10 border-slate-200 border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b dark:border-white/10 border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold dark:text-white text-slate-900 flex items-center gap-2">
                <BookOpen size={16} className="text-cyan-400" />
                {editingChapterId ? "تعديل فصل" : "إضافة فصل جديد"}
              </h3>
              <button onClick={() => setPanel("content")} className="dark:text-white/40 text-slate-400 hover:dark:text-white hover:text-slate-900 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs dark:text-white/50 text-slate-500 mb-1.5 block">العنوان بالعربية <span className="text-red-400">*</span></label>
                <input className={inp} placeholder="أساسيات HTML" value={chapterForm.titleAr}
                  onChange={(e) => {
                    const v = e.target.value;
                    setChapterForm((p) => ({ ...p, titleAr: v, slug: chapterSlugManual.current ? p.slug : slugify(v) }));
                  }} />
              </div>
              <div>
                <label className="text-xs dark:text-white/50 text-slate-500 mb-1.5 block">Slug <span className="text-red-400">*</span></label>
                <input className={inp + " font-mono"} placeholder="html-basics" value={chapterForm.slug}
                  onChange={(e) => { chapterSlugManual.current = true; setChapterForm((p) => ({ ...p, slug: e.target.value })); }} />
              </div>
              <div>
                <label className="text-xs dark:text-white/50 text-slate-500 mb-1.5 block">الترتيب</label>
                <input type="number" className={inp} value={chapterForm.order} onChange={(e) => setChapterForm((p) => ({ ...p, order: +e.target.value }))} />
              </div>
            </div>
            <div className="px-6 py-4 border-t dark:border-white/10 border-slate-200 flex justify-end gap-3">
              <button onClick={() => setPanel("content")} className="px-4 py-2 text-sm dark:text-white/50 text-slate-500 hover:dark:text-white hover:text-slate-900 border dark:border-white/10 border-slate-200 rounded-xl transition-colors">إلغاء</button>
              <button onClick={saveChapter} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-500 to-violet-500 hover:opacity-90 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-opacity">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} حفظ
              </button>
            </div>
          </div>
        )}

        {/* ── Panel: Topic Edit Form ── */}
        {panel === "topic-edit" && (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* Main form */}
            <div className="xl:col-span-3 dark:bg-white/[0.04] bg-white dark:border-white/10 border-slate-200 border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b dark:border-white/10 border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold dark:text-white text-slate-900 flex items-center gap-2">
                  <FileText size={16} className="text-cyan-400" />
                  {editingTopicId ? "تعديل موضوع" : "موضوع جديد"}
                </h3>
                <button onClick={() => setPanel("content")} className="dark:text-white/40 text-slate-400 hover:dark:text-white hover:text-slate-900 transition-colors"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs dark:text-white/50 text-slate-500 mb-1.5 block">العنوان بالعربية <span className="text-red-400">*</span></label>
                    <input className={inp} placeholder="عناصر العناوين في HTML" value={topicForm.titleAr}
                      onChange={(e) => {
                        const v = e.target.value;
                        setTopicForm((p) => ({ ...p, titleAr: v, slug: topicSlugManual.current ? p.slug : slugify(v) }));
                      }} />
                  </div>
                  <div>
                    <label className="text-xs dark:text-white/50 text-slate-500 mb-1.5 block">Slug <span className="text-red-400">*</span></label>
                    <input className={inp + " font-mono"} placeholder="html-headings" value={topicForm.slug}
                      onChange={(e) => { topicSlugManual.current = true; setTopicForm((p) => ({ ...p, slug: e.target.value })); }} />
                  </div>
                </div>

                <div>
                  <label className="text-xs dark:text-white/50 text-slate-500 mb-1.5 block">الفصل</label>
                  <select className={inp} value={topicForm.chapterId ?? ""} onChange={(e) => setTopicForm((p) => ({ ...p, chapterId: e.target.value ? +e.target.value : null }))}>
                    <option value="">بدون فصل</option>
                    {chapters.map((ch) => <option key={ch.id} value={ch.id}>{ch.titleAr}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs dark:text-white/50 text-slate-500 mb-1.5 block flex items-center gap-1">
                    <AlignLeft size={11} /> الشرح بالعربية
                  </label>
                  <textarea className={inp} rows={6} placeholder="شرح مفصل للموضوع بالعربية..." value={topicForm.conceptExplanationAr} onChange={(e) => setTopicForm((p) => ({ ...p, conceptExplanationAr: e.target.value }))} />
                </div>

                <div>
                  <label className="text-xs dark:text-white/50 text-slate-500 mb-1.5 block flex items-center gap-1">
                    <Code2 size={11} /> الصياغة (Syntax)
                  </label>
                  <textarea className={inp + " font-mono text-xs"} rows={4} placeholder={`<h1>عنوان</h1>\n<h2>عنوان ثانوي</h2>`} value={topicForm.syntaxCode ?? ""} onChange={(e) => setTopicForm((p) => ({ ...p, syntaxCode: e.target.value }))} />
                </div>

                <div>
                  <label className="text-xs dark:text-white/50 text-slate-500 mb-1.5 block">النصائح الاحترافية</label>
                  <textarea className={inp} rows={3} placeholder="نصيحة في كل سطر..." value={topicForm.proTipsAr ?? ""} onChange={(e) => setTopicForm((p) => ({ ...p, proTipsAr: e.target.value }))} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs dark:text-white/50 text-slate-500 mb-1.5 block">الترتيب</label>
                    <input type="number" className={inp} value={topicForm.order} onChange={(e) => setTopicForm((p) => ({ ...p, order: +e.target.value }))} />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className={`w-10 h-5 rounded-full transition-colors relative ${topicForm.isPublished ? "bg-emerald-500" : "dark:bg-white/10 bg-slate-200"}`} onClick={() => setTopicForm((p) => ({ ...p, isPublished: !p.isPublished }))}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${topicForm.isPublished ? "translate-x-5" : "translate-x-0.5"}`} />
                      </div>
                      <span className="text-sm dark:text-white/70 text-slate-600">منشور</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t dark:border-white/10 border-slate-200 flex justify-end gap-3">
                <button onClick={() => setPanel("content")} className="px-4 py-2 text-sm dark:text-white/50 text-slate-500 hover:dark:text-white hover:text-slate-900 border dark:border-white/10 border-slate-200 rounded-xl transition-colors">إلغاء</button>
                <button onClick={saveTopic} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-500 to-violet-500 hover:opacity-90 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-opacity">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} حفظ الموضوع
                </button>
              </div>
            </div>

            {/* Right: SEO + Code Examples */}
            <div className="xl:col-span-2 space-y-4">
              {/* SEO Keywords */}
              <div className="dark:bg-white/[0.04] bg-white dark:border-white/10 border-slate-200 border rounded-2xl p-5 space-y-3">
                <h4 className="text-sm font-medium dark:text-white text-slate-900 flex items-center gap-2">
                  <Tag size={13} className="text-violet-400" /> كلمات SEO
                </h4>
                <div className="flex gap-2">
                  <input className={inp} placeholder="أضف كلمة واضغط Enter" value={seoKwInput}
                    onChange={(e) => setSeoKwInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())} />
                  <button onClick={addKeyword} className="flex-shrink-0 w-9 h-9 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 rounded-xl text-violet-400 flex items-center justify-center transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-8">
                  {topicForm.seoKeywords.length === 0 && <span className="text-xs dark:text-white/20 text-slate-400">لا كلمات بعد</span>}
                  {topicForm.seoKeywords.map((kw) => (
                    <span key={kw} className="inline-flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-300 text-xs rounded-full px-2.5 py-1">
                      {kw}
                      <button onClick={() => setTopicForm((p) => ({ ...p, seoKeywords: p.seoKeywords.filter((k) => k !== kw) }))} className="opacity-60 hover:opacity-100 hover:text-red-400 transition-opacity"><X size={9} /></button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Code Examples */}
              <div className="dark:bg-white/[0.04] bg-white dark:border-white/10 border-slate-200 border rounded-2xl p-5 space-y-3">
                <h4 className="text-sm font-medium dark:text-white text-slate-900 flex items-center gap-2">
                  <Code2 size={13} className="text-cyan-400" /> أمثلة الكود
                </h4>

                {/* Existing examples */}
                {topicForm.codeExamples.length > 0 && (
                  <div className="space-y-2 pb-1">
                    {topicForm.codeExamples.map((ex, i) => (
                      <div key={i} className="flex items-center justify-between dark:bg-white/5 bg-slate-100 dark:border-white/10 border-slate-200 border rounded-xl px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-xs dark:text-white/80 text-slate-700 font-medium truncate">{ex.title || `مثال ${i + 1}`}</p>
                          <p className="text-xs dark:text-white/30 text-slate-400 font-mono">{ex.language} · {ex.code.split("\n").length} سطر</p>
                        </div>
                        <button onClick={() => setTopicForm((p) => ({ ...p, codeExamples: p.codeExamples.filter((_, j) => j !== i) }))} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-500/10 dark:text-white/30 text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new */}
                <div className="border border-dashed dark:border-white/10 border-slate-200 rounded-xl p-3 space-y-2">
                  <p className="text-xs dark:text-white/30 text-slate-400 mb-2">إضافة مثال جديد</p>
                  <input className={inp} placeholder="عنوان المثال (اختياري)" value={codeEx.title} onChange={(e) => setCodeEx((p) => ({ ...p, title: e.target.value }))} />
                  <select className={inp} value={codeEx.language} onChange={(e) => setCodeEx((p) => ({ ...p, language: e.target.value }))}>
                    {["html", "css", "javascript", "python", "react", "typescript", "sql", "bash", "json"].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <textarea className={inp + " font-mono text-xs"} rows={4} placeholder="الكود هنا..." value={codeEx.code} onChange={(e) => setCodeEx((p) => ({ ...p, code: e.target.value }))} />
                  <button onClick={addCodeExample} className="w-full flex items-center justify-center gap-2 text-xs bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl py-2 text-cyan-500 dark:text-cyan-400 transition-colors">
                    <Plus size={12} /> إضافة هذا المثال
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
