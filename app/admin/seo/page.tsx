"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Save, Loader2, CheckCircle, ExternalLink, Globe, BarChart3, FileText, CheckSquare, Square } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface SeoSettings {
  siteName: string; siteUrl: string; defaultDescription: string; defaultOgImage: string;
  googleVerification: string; bingVerification: string; googleAnalyticsId: string;
  robotsDisallow: string; robotsAllow: string; indexingEnabled: boolean;
}

const CHECKLIST = [
  { id: 1, title: "إنشاء حساب Google Search Console", desc: "اذهب إلى search.google.com/search-console وسجّل موقعك", link: "https://search.google.com/search-console", done: false },
  { id: 2, title: "التحقق من الملكية (Verification)", desc: "اختر 'HTML tag' وأدخل Meta Verification Tag في الحقل أعلاه، ثم احفظ", done: false },
  { id: 3, title: "إرسال Sitemap", desc: "في Search Console → Sitemaps → أدخل: sitemap.xml", link: "", done: false },
  { id: 4, title: "فحص أي صفحة", desc: "استخدم URL Inspection لفحص الصفحة الرئيسية وطلب الفهرسة", done: false },
  { id: 5, title: "ربط Google Analytics (اختياري)", desc: "أدخل معرف GA4 في الحقل المخصص وستُحمَّل السكريبت تلقائياً", done: false },
  { id: 6, title: "ربط Bing Webmaster Tools", desc: "اذهب إلى bing.com/webmasters وأضف موقعك، ثم أدخل Meta Tag", link: "https://www.bing.com/webmasters", done: false },
  { id: 7, title: "التحقق من robots.txt", desc: "تأكد من أن /robots.txt يعكس الإعدادات الصحيحة", link: "/robots.txt", done: false },
  { id: 8, title: "فحص sitemap.xml", desc: "تأكد من ظهور جميع الصفحات في /sitemap.xml", link: "/sitemap.xml", done: false },
];

export default function AdminSeoPage() {
  const [settings, setSettings] = useState<SeoSettings>({
    siteName: "نوفيل | منصة تعليم البرمجة",
    siteUrl: "https://nouvil.com",
    defaultDescription: "تعلم البرمجة بالعربي مع نوفيل",
    defaultOgImage: "", googleVerification: "", bingVerification: "",
    googleAnalyticsId: "", robotsDisallow: "/admin/,/dashboard/,/api/,/auth/",
    robotsAllow: "/,/courses/,/articles/,/problems/", indexingEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [checklist, setChecklist] = useState(CHECKLIST.map(i => ({ ...i, done: false })));

  useEffect(() => {
    api.get<SeoSettings>("/admin/settings/seo")
      .then(d => setSettings(s => ({ ...s, ...d })))
      .catch(() => {})
      .finally(() => setLoading(false));
    const stored = localStorage.getItem("seo_checklist");
    if (stored) setChecklist(JSON.parse(stored));
  }, []);

  const toggleCheck = (id: number) => {
    const updated = checklist.map(c => c.id === id ? { ...c, done: !c.done } : c);
    setChecklist(updated);
    localStorage.setItem("seo_checklist", JSON.stringify(updated));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/admin/settings/seo", settings);
      toast.success("تم حفظ إعدادات SEO بنجاح");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const completedCount = checklist.filter(c => c.done).length;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
          <Search className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black dark:text-white text-slate-900">إعدادات محركات البحث (SEO)</h1>
          <p className="dark:text-slate-400 text-slate-600 text-sm">ضبط الميتا تاج وفهرسة جوجل وAnalytics</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Basic SEO */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6">
          <h2 className="font-bold dark:text-white text-slate-900 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" /> الميتا الأساسية
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">اسم الموقع (Title)</label>
              <input value={settings.siteName} onChange={e => setSettings(s => ({ ...s, siteName: e.target.value }))}
                className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">رابط الموقع</label>
              <input value={settings.siteUrl} onChange={e => setSettings(s => ({ ...s, siteUrl: e.target.value }))}
                className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">الوصف الافتراضي</label>
              <textarea value={settings.defaultDescription} onChange={e => setSettings(s => ({ ...s, defaultDescription: e.target.value }))}
                rows={3} className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 w-full resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">رابط صورة OG الافتراضية</label>
              <input value={settings.defaultOgImage ?? ""} onChange={e => setSettings(s => ({ ...s, defaultOgImage: e.target.value }))}
                placeholder="https://nouvil.com/og-image.jpg" dir="ltr"
                className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 w-full" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="indexing" checked={settings.indexingEnabled}
                onChange={e => setSettings(s => ({ ...s, indexingEnabled: e.target.checked }))}
                className="w-4 h-4 rounded accent-cyan-500" />
              <label htmlFor="indexing" className="text-sm dark:text-slate-300 text-slate-700">تفعيل الفهرسة (index, follow)</label>
            </div>
          </div>
        </motion.div>

        {/* Verification */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6">
          <h2 className="font-bold dark:text-white text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" /> التحقق والتتبع
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">
                Google Search Console Verification
              </label>
              <input value={settings.googleVerification ?? ""} onChange={e => setSettings(s => ({ ...s, googleVerification: e.target.value }))}
                placeholder="google-site-verification=XXXX..." dir="ltr"
                className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 w-full" />
              <p className="text-xs dark:text-slate-500 text-slate-400 mt-1">أدخل محتوى الـ meta content فقط</p>
            </div>
            <div>
              <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">
                Bing Webmaster Verification
              </label>
              <input value={settings.bingVerification ?? ""} onChange={e => setSettings(s => ({ ...s, bingVerification: e.target.value }))}
                placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" dir="ltr"
                className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">
                Google Analytics 4 (G-XXXXXXXX)
              </label>
              <input value={settings.googleAnalyticsId ?? ""} onChange={e => setSettings(s => ({ ...s, googleAnalyticsId: e.target.value }))}
                placeholder="G-XXXXXXXXXX" dir="ltr"
                className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 w-full" />
            </div>
            <div className="p-3 rounded-xl dark:bg-cyan-500/5 bg-cyan-50 border dark:border-cyan-500/20 border-cyan-200">
              <p className="text-xs text-cyan-600 dark:text-cyan-400">
                ✓ Sitemap: <a href="/sitemap.xml" target="_blank" className="underline font-mono">/sitemap.xml</a><br />
                ✓ Robots: <a href="/robots.txt" target="_blank" className="underline font-mono">/robots.txt</a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Robots.txt config */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6">
        <h2 className="font-bold dark:text-white text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" /> إعدادات robots.txt
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">
              Allow (مسارات مسموح بها)
            </label>
            <textarea value={settings.robotsAllow} onChange={e => setSettings(s => ({ ...s, robotsAllow: e.target.value }))}
              rows={3} placeholder="/,/courses/,/articles/..." dir="ltr"
              className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 w-full resize-none font-mono text-sm" />
            <p className="text-xs dark:text-slate-500 text-slate-400 mt-1">افصل المسارات بفاصلة</p>
          </div>
          <div>
            <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">
              Disallow (مسارات محظورة)
            </label>
            <textarea value={settings.robotsDisallow} onChange={e => setSettings(s => ({ ...s, robotsDisallow: e.target.value }))}
              rows={3} placeholder="/admin/,/api/,/auth/..." dir="ltr"
              className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 w-full resize-none font-mono text-sm" />
          </div>
        </div>
      </motion.div>

      {/* Google Search Console Checklist */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold dark:text-white text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-cyan-400" /> دليل فهرسة جوجل خطوة بخطوة
          </h2>
          <span className="text-sm font-semibold text-cyan-400">{completedCount}/{checklist.length} مكتمل</span>
        </div>
        <div className="w-full h-2 dark:bg-white/10 bg-slate-200 rounded-full mb-4 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / checklist.length) * 100}%` }} />
        </div>
        <div className="space-y-3">
          {checklist.map(item => (
            <div key={item.id}
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer
                ${item.done
                  ? "dark:bg-green-500/10 bg-green-50 dark:border-green-500/30 border-green-200"
                  : "dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 hover:border-cyan-500/30"
                }`}
              onClick={() => toggleCheck(item.id)}>
              <div className={`mt-0.5 flex-shrink-0 ${item.done ? "text-green-500" : "dark:text-slate-500 text-slate-400"}`}>
                {item.done ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${item.done ? "line-through dark:text-green-400 text-green-700" : "dark:text-white text-slate-900"}`}>
                  {item.id}. {item.title}
                </p>
                <p className="text-xs dark:text-slate-400 text-slate-600 mt-0.5">{item.desc}</p>
                {item.link && (
                  <a href={item.link} target="_blank" rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline mt-1">
                    <ExternalLink className="w-3 h-3" /> فتح الرابط
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center py-3 text-base">
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
        {saving ? "جاري الحفظ..." : saved ? "تم الحفظ ✓" : "حفظ إعدادات SEO"}
      </button>
    </div>
  );
}
