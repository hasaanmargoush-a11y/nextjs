"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AdminSectionGuard } from "@/components/admin/AdminSectionGuard";
import SeoPanel from "./SeoPanel";
import PublishSidebar from "./PublishSidebar";
import ImageUploadField from "./ImageUploadField";
import { generateSlugFromTitle } from "@/lib/seo-analyzer";
import {
  ArrowRight, Loader2, Newspaper, Image as ImageIcon, Tag, X, Plus,
  BookOpen, Search, Eye, PanelRight, PanelRightClose, Wand2,
} from "lucide-react";
import Link from "next/link";
import ArticlePreview from "./ArticlePreview";

const BlockEditor = dynamic(() => import("./BlockEditor"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border dark:border-white/10 border-slate-200 h-96 flex items-center justify-center dark:bg-[#0d1424] bg-white">
      <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
    </div>
  ),
});

const CATEGORIES = [
  "Python","JavaScript","TypeScript","React","Vue","Angular","تقنيات الويب",
  "DevOps","الخوارزميات","نصائح المبرمجين","ذكاء اصطناعي","قواعد البيانات",
  "الأمن السيبراني","الموبايل","البرمجة بالعربي","مفاهيم البرمجة",
];

interface ArticleForm {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  authorName: string;
  tags: string[];
  thumbnail: string;
  featuredImageAlt: string;
  isFeatured: boolean;
  isPublished: boolean;
  status: string;
  publishedAt: string;
  scheduledAt: string;
  focusKeyword: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  canonicalUrl: string;
  noIndex: boolean;
  noFollow: boolean;
  commentsEnabled: boolean;
}

const defaultForm: ArticleForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "",
  authorName: "فريق نوفيل",
  tags: [],
  thumbnail: "",
  featuredImageAlt: "",
  isFeatured: false,
  isPublished: true,
  status: "draft",
  publishedAt: "",
  scheduledAt: "",
  focusKeyword: "",
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  twitterTitle: "",
  twitterDescription: "",
  twitterImage: "",
  canonicalUrl: "",
  noIndex: false,
  noFollow: false,
  commentsEnabled: true,
};

type Tab = "content" | "seo" | "media";

export default function ArticleEditorPage({ articleId }: { articleId?: number }) {
  const router = useRouter();
  const isNew = !articleId;

  const [form, setForm] = useState<ArticleForm>(defaultForm);
  const [loading, setLoading] = useState(!isNew);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("content");
  const [tagInput, setTagInput] = useState("");
  const [savedId, setSavedId] = useState<number | undefined>(articleId);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!isNew) {
      api.get<Record<string, unknown>>(`/admin/articles/${articleId}`)
        .then((data) => {
          const publishedAt = data.publishedAt ? new Date(data.publishedAt as string).toISOString().slice(0, 16) : "";
          const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt as string).toISOString().slice(0, 16) : "";
          setForm({
            title: (data.title as string) || "",
            slug: (data.slug as string) || "",
            excerpt: (data.excerpt as string) || "",
            content: (data.content as string) || "",
            category: (data.category as string) || "",
            authorName: (data.authorName as string) || "فريق نوفيل",
            tags: (data.tags as string[]) || [],
            thumbnail: (data.thumbnail as string) || "",
            featuredImageAlt: (data.featuredImageAlt as string) || "",
            isFeatured: !!(data.isFeatured),
            isPublished: !!(data.isPublished),
            status: (data.status as string) || "draft",
            publishedAt,
            scheduledAt,
            focusKeyword: (data.focusKeyword as string) || "",
            metaTitle: (data.metaTitle as string) || "",
            metaDescription: (data.metaDescription as string) || "",
            metaKeywords: ((data.metaKeywords as string[]) || []).join(", "),
            ogTitle: (data.ogTitle as string) || "",
            ogDescription: (data.ogDescription as string) || "",
            ogImage: (data.ogImage as string) || "",
            twitterTitle: (data.twitterTitle as string) || "",
            twitterDescription: (data.twitterDescription as string) || "",
            twitterImage: (data.twitterImage as string) || "",
            canonicalUrl: (data.canonicalUrl as string) || "",
            noIndex: !!(data.noIndex),
            noFollow: !!(data.noFollow),
            commentsEnabled: data.commentsEnabled !== false,
          });
        })
        .catch(() => toast.error("فشل تحميل المقال"))
        .finally(() => setLoading(false));
    }
  }, [articleId, isNew]);

  const buildPayload = useCallback((status?: string) => {
    const targetStatus = status || form.status;
    return {
      title: form.title,
      slug: form.slug || undefined,
      excerpt: form.excerpt,
      content: form.content,
      contentFormat: "html",
      category: form.category,
      authorName: form.authorName,
      tags: form.tags,
      thumbnail: form.thumbnail || undefined,
      featuredImageAlt: form.featuredImageAlt || undefined,
      isFeatured: form.isFeatured,
      isPublished: targetStatus === "published",
      status: targetStatus,
      publishedAt: form.publishedAt || undefined,
      scheduledAt: form.scheduledAt || undefined,
      focusKeyword: form.focusKeyword || undefined,
      metaTitle: form.metaTitle || undefined,
      metaDescription: form.metaDescription || undefined,
      metaKeywords: form.metaKeywords ? form.metaKeywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
      ogTitle: form.ogTitle || undefined,
      ogDescription: form.ogDescription || undefined,
      ogImage: form.ogImage || undefined,
      twitterTitle: form.twitterTitle || undefined,
      twitterDescription: form.twitterDescription || undefined,
      twitterImage: form.twitterImage || undefined,
      canonicalUrl: form.canonicalUrl || undefined,
      noIndex: form.noIndex,
      noFollow: form.noFollow,
      commentsEnabled: form.commentsEnabled,
    };
  }, [form]);

  const handleSave = useCallback(async (statusOverride?: string) => {
    if (!form.title.trim()) { toast.error("العنوان مطلوب"); return; }
    if (!form.excerpt.trim()) { toast.error("المقتطف مطلوب"); return; }
    if (!form.category) { toast.error("التصنيف مطلوب"); return; }
    setIsSaving(true);
    try {
      const payload = buildPayload(statusOverride);
      if (savedId) {
        await api.patch(`/admin/articles/${savedId}`, payload);
        toast.success("تم حفظ المقال");
      } else {
        const res = await api.post<{ id: number }>("/admin/articles", payload);
        setSavedId(res.id);
        toast.success("تم إنشاء المقال");
        router.replace(`/admin/articles/editor/${res.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setIsSaving(false);
    }
  }, [form, savedId, buildPayload, router]);

  const handlePublish = useCallback(async () => {
    if (!form.title.trim()) { toast.error("العنوان مطلوب"); return; }
    if (!form.excerpt.trim()) { toast.error("المقتطف مطلوب"); return; }
    if (!form.category) { toast.error("التصنيف مطلوب"); return; }
    setIsSubmitting(true);
    try {
      const payload = buildPayload("published");
      payload.isPublished = true;
      if (savedId) {
        await api.patch(`/admin/articles/${savedId}`, payload);
        toast.success("تم نشر المقال بنجاح");
        setForm((f) => ({ ...f, status: "published", isPublished: true }));
      } else {
        const res = await api.post<{ id: number }>("/admin/articles", payload);
        setSavedId(res.id);
        toast.success("تم نشر المقال بنجاح");
        router.replace(`/admin/articles/editor/${res.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setIsSubmitting(false);
    }
  }, [form, savedId, buildPayload, router]);

  const handleDelete = useCallback(async () => {
    if (!savedId) return;
    try {
      await api.delete(`/admin/articles/${savedId}`);
      toast.success("تم حذف المقال");
      router.push("/admin/articles");
    } catch {
      toast.error("فشل حذف المقال");
    }
  }, [savedId, router]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));

  const setField = (field: keyof ArticleForm, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const inputClass = "w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm transition-colors";

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "content", label: "المحتوى", icon: <BookOpen className="w-4 h-4" /> },
    { id: "seo", label: "SEO", icon: <Search className="w-4 h-4" /> },
    { id: "media", label: "الميديا", icon: <ImageIcon className="w-4 h-4" /> },
  ];

  return (
    <AdminSectionGuard section="articles">
      <div dir="rtl" className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        <div className="sticky top-0 z-40 dark:bg-[#0a0f1e]/95 bg-white/95 backdrop-blur border-b dark:border-white/10 border-slate-200">
          <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/admin/articles" className="flex items-center gap-1.5 text-sm dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors">
                <ArrowRight className="w-4 h-4" />
                المقالات
              </Link>
              <span className="dark:text-slate-600 text-slate-300">/</span>
              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-semibold dark:text-white text-slate-900 line-clamp-1 max-w-xs">
                  {form.title || (isNew ? "مقال جديد" : "تعديل مقال")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview((v) => !v)}
                title={showPreview ? "إخفاء المعاينة" : "عرض معاينة فورية"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  showPreview
                    ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30"
                    : "dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 hover:text-violet-400"
                }`}
              >
                {showPreview ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRight className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{showPreview ? "إخفاء" : "معاينة"}</span>
              </button>
              {savedId && (
                <a href={`/articles/${form.slug || savedId}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg dark:bg-white/5 bg-slate-100 text-sm dark:text-slate-300 text-slate-600 hover:text-cyan-400 transition-colors">
                  <Eye className="w-3.5 h-3.5" /> فتح
                </a>
              )}
              <button onClick={() => handleSave()} disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg dark:bg-white/10 bg-slate-200 text-sm dark:text-slate-300 text-slate-700 font-medium hover:dark:bg-white/20 transition-colors disabled:opacity-50">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                حفظ مسودة
              </button>
              <button onClick={handlePublish} disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-bold transition-colors disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {form.status === "published" ? "تحديث" : "نشر"}
              </button>
            </div>
          </div>
        </div>

        <div className={`mx-auto px-4 py-6 ${showPreview ? "max-w-full" : "max-w-screen-xl"}`}>
          <div className={`gap-6 ${showPreview ? "grid grid-cols-1 xl:grid-cols-2" : "grid grid-cols-1 xl:grid-cols-[1fr_300px]"}`}>
            <div className="space-y-5 min-w-0">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div>
                  <input
                    value={form.title}
                    onChange={(e) => {
                      setField("title", e.target.value);
                      if (!form.metaTitle) setField("metaTitle", e.target.value.slice(0, 60));
                    }}
                    className="w-full text-2xl font-black dark:text-white text-slate-900 dark:bg-transparent bg-transparent outline-none border-b-2 dark:border-white/10 border-slate-200 focus:border-cyan-500 pb-2 transition-colors placeholder:dark:text-slate-700 placeholder:text-slate-300"
                    placeholder="عنوان المقال..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs dark:text-slate-400 text-slate-500">Slug (رابط SEO)</label>
                      {form.title && (
                        <button
                          type="button"
                          onClick={() => setField("slug", generateSlugFromTitle(form.title))}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] dark:bg-violet-500/10 bg-violet-50 dark:text-violet-400 text-violet-600 border dark:border-violet-500/20 border-violet-200 hover:dark:bg-violet-500/20 transition-colors"
                        >
                          <Wand2 className="w-2.5 h-2.5" />
                          توليد
                        </button>
                      )}
                    </div>
                    <input
                      value={form.slug}
                      onChange={(e) => setField("slug", e.target.value)}
                      className={inputClass}
                      placeholder="my-article-slug"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs dark:text-slate-400 text-slate-500 mb-1">التصنيف</label>
                    <select value={form.category} onChange={(e) => setField("category", e.target.value)} className={inputClass}>
                      <option value="" className="dark:bg-[#111827]">اختر تصنيفاً</option>
                      {CATEGORIES.map((c) => <option key={c} value={c} className="dark:bg-[#111827]">{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs dark:text-slate-400 text-slate-500 mb-1">المقتطف (Excerpt)</label>
                  <textarea
                    value={form.excerpt}
                    onChange={(e) => {
                      setField("excerpt", e.target.value);
                      if (!form.metaDescription) setField("metaDescription", e.target.value.slice(0, 160));
                    }}
                    rows={2}
                    className={`${inputClass} resize-none`}
                    placeholder="ملخص المقال الذي يظهر في بطاقات البحث..."
                  />
                  <p className="text-xs dark:text-slate-600 text-slate-400 mt-1">{form.excerpt.length} حرف</p>
                </div>
              </motion.div>

              <div className="flex gap-1 border-b dark:border-white/10 border-slate-200">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px
                      ${activeTab === tab.id
                        ? "border-cyan-500 text-cyan-400"
                        : "border-transparent dark:text-slate-400 text-slate-500 hover:text-cyan-400"
                      }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "content" && (
                <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <BlockEditor
                    value={form.content}
                    onChange={(json) => setField("content", json)}
                  />
                </motion.div>
              )}

              {activeTab === "seo" && (
                <motion.div key="seo" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <SeoPanel
                    form={{
                      title: form.title,
                      slug: form.slug,
                      excerpt: form.excerpt,
                      category: form.category,
                      focusKeyword: form.focusKeyword,
                      metaTitle: form.metaTitle,
                      metaDescription: form.metaDescription,
                      metaKeywords: form.metaKeywords,
                      canonicalUrl: form.canonicalUrl,
                      ogTitle: form.ogTitle,
                      ogDescription: form.ogDescription,
                      ogImage: form.ogImage,
                      twitterTitle: form.twitterTitle,
                      twitterDescription: form.twitterDescription,
                      twitterImage: form.twitterImage,
                      noIndex: form.noIndex,
                      noFollow: form.noFollow,
                      thumbnail: form.thumbnail,
                      featuredImageAlt: form.featuredImageAlt,
                      tags: form.tags,
                      authorName: form.authorName,
                      content: form.content,
                    }}
                    onChange={(field, value) => setField(field as keyof ArticleForm, value)}
                  />
                </motion.div>
              )}

              {activeTab === "media" && (
                <motion.div key="media" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="rounded-xl border dark:border-white/10 border-slate-200 p-4 dark:bg-[#111827] bg-slate-50 space-y-3">
                    <h3 className="text-sm font-bold dark:text-white text-slate-900 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-violet-400" />
                      الصورة الرئيسية
                    </h3>
                    <ImageUploadField
                      value={form.thumbnail}
                      onChange={(url) => {
                        setField("thumbnail", url);
                        if (!form.ogImage) setField("ogImage", url);
                        if (!form.twitterImage) setField("twitterImage", url);
                      }}
                      label="صورة المقال"
                      hint="ستُستخدم تلقائياً كصورة مشاركة على وسائل التواصل الاجتماعي إن لم تُحدد صورة أخرى"
                      previewHeight="h-48"
                    />
                    <div>
                      <label className="block text-xs dark:text-slate-400 text-slate-500 mb-1">النص البديل (Alt Text) — مهم لـ SEO</label>
                      <input value={form.featuredImageAlt} onChange={(e) => setField("featuredImageAlt", e.target.value)} className={inputClass} placeholder="وصف الصورة للمحركات والإعاقة البصرية" />
                    </div>
                  </div>

                  <div className="rounded-xl border dark:border-white/10 border-slate-200 p-4 dark:bg-[#111827] bg-slate-50 space-y-3">
                    <h3 className="text-sm font-bold dark:text-white text-slate-900 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-cyan-400" />
                      الوسوم (Tags)
                    </h3>
                    <div className="flex gap-2">
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                        className={`${inputClass} flex-1`}
                        placeholder="اكتب وسماً ثم اضغط Enter"
                      />
                      <button type="button" onClick={addTag} className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.tags.map((tag) => (
                        <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full dark:bg-violet-500/10 bg-violet-50 dark:text-violet-300 text-violet-700 text-xs border dark:border-violet-500/20 border-violet-100">
                          #{tag}
                          <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {form.tags.length === 0 && <p className="text-xs dark:text-slate-600 text-slate-400">لا توجد وسوم</p>}
                    </div>
                  </div>

                  <div className="rounded-xl border dark:border-white/10 border-slate-200 p-4 dark:bg-[#111827] bg-slate-50 space-y-3">
                    <h3 className="text-sm font-bold dark:text-white text-slate-900">معلومات الكاتب</h3>
                    <div>
                      <label className="block text-xs dark:text-slate-400 text-slate-500 mb-1">اسم الكاتب</label>
                      <input value={form.authorName} onChange={(e) => setField("authorName", e.target.value)} className={inputClass} />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {showPreview ? (
              <div className="xl:sticky xl:top-16 xl:self-start overflow-hidden rounded-2xl border dark:border-violet-500/20 border-violet-200 dark:bg-[#0d1424] bg-white shadow-2xl shadow-violet-500/10">
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col" style={{ maxHeight: "calc(100vh - 4.5rem)" }}>
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b dark:border-white/10 border-slate-200 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                    <span className="text-xs font-semibold dark:text-violet-300 text-violet-600">معاينة فورية</span>
                    <span className="text-xs dark:text-slate-600 text-slate-400 mr-auto">تتحدث مع كل تعديل</span>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <ArticlePreview
                      title={form.title}
                      excerpt={form.excerpt}
                      content={form.content}
                      category={form.category}
                      authorName={form.authorName}
                      tags={form.tags}
                      thumbnail={form.thumbnail}
                      slug={form.slug}
                      publishedAt={form.publishedAt || undefined}
                      isFeatured={form.isFeatured}
                      metaTitle={form.metaTitle}
                      metaDescription={form.metaDescription}
                      focusKeyword={form.focusKeyword}
                      ogTitle={form.ogTitle}
                      ogDescription={form.ogDescription}
                      ogImage={form.ogImage}
                      twitterTitle={form.twitterTitle}
                      twitterDescription={form.twitterDescription}
                      twitterImage={form.twitterImage}
                    />
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="xl:sticky xl:top-20 xl:self-start space-y-4">
                <PublishSidebar
                  status={form.status}
                  isPublished={form.isPublished}
                  isFeatured={form.isFeatured}
                  commentsEnabled={form.commentsEnabled}
                  publishedAt={form.publishedAt}
                  scheduledAt={form.scheduledAt}
                  articleId={savedId}
                  isSubmitting={isSubmitting}
                  isSaving={isSaving}
                  onStatusChange={(status) => {
                    setField("status", status);
                    setField("isPublished", status === "published");
                  }}
                  onFieldChange={(field, value) => setField(field as keyof ArticleForm, value)}
                  onSave={() => handleSave()}
                  onPublish={handlePublish}
                  onDelete={savedId ? handleDelete : undefined}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminSectionGuard>
  );
}
