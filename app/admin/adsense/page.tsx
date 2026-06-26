"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, Save, Loader2, CheckCircle, AlertTriangle, Zap, LayoutTemplate } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface AdsenseSettings {
  enabled: boolean; publisherId: string; autoAds: boolean;
  adSlotTop: string; adSlotSide: string; adSlotBottom: string;
}

export default function AdminAdsensePage() {
  const [settings, setSettings] = useState<AdsenseSettings>({
    enabled: false, publisherId: "", autoAds: false,
    adSlotTop: "", adSlotSide: "", adSlotBottom: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<AdsenseSettings>("/admin/settings/adsense")
      .then(d => setSettings(s => ({ ...s, ...d })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/admin/settings/adsense", settings);
      toast.success("تم حفظ إعدادات AdSense بنجاح");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black dark:text-white text-slate-900">إعدادات Google AdSense</h1>
          <p className="dark:text-slate-400 text-slate-600 text-sm">ضبط Publisher ID وتفعيل الإعلانات على الموقع</p>
        </div>
      </div>

      {/* Status Banner */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border p-5 flex items-center gap-4 ${
          settings.enabled
            ? "dark:bg-green-500/10 bg-green-50 dark:border-green-500/30 border-green-200"
            : "dark:bg-amber-500/10 bg-amber-50 dark:border-amber-500/30 border-amber-200"
        }`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          settings.enabled ? "bg-green-500/20" : "bg-amber-500/20"
        }`}>
          {settings.enabled ? <Zap className="w-6 h-6 text-green-500" /> : <AlertTriangle className="w-6 h-6 text-amber-500" />}
        </div>
        <div className="flex-1">
          <p className={`font-bold ${settings.enabled ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
            {settings.enabled ? "الإعلانات مفعّلة ✓" : "الإعلانات معطّلة"}
          </p>
          <p className="text-sm dark:text-slate-400 text-slate-600 mt-0.5">
            {settings.enabled
              ? "سيتم تحميل سكريبت AdSense وعرض الإعلانات على الموقع"
              : "لن تظهر أي إعلانات حتى تُفعّل AdSense وتُدخل Publisher ID"
            }
          </p>
        </div>
        <button
          onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
          className={`relative w-14 h-7 rounded-full transition-all flex-shrink-0 ${settings.enabled ? "bg-green-500" : "dark:bg-white/10 bg-slate-200"}`}>
          <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${settings.enabled ? "right-1" : "left-1"}`} />
        </button>
      </motion.div>

      {/* Publisher ID */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6">
        <h2 className="font-bold dark:text-white text-slate-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-cyan-400" /> Publisher ID
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">
              Google Publisher ID
            </label>
            <input
              value={settings.publisherId}
              onChange={e => setSettings(s => ({ ...s, publisherId: e.target.value }))}
              placeholder="ca-pub-XXXXXXXXXXXXXXXX" dir="ltr"
              className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 w-full font-mono" />
            <p className="text-xs dark:text-slate-500 text-slate-400 mt-1">
              ستجده في حساب AdSense → الحساب → معلومات الحساب
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="autoAds" checked={settings.autoAds}
              onChange={e => setSettings(s => ({ ...s, autoAds: e.target.checked }))}
              className="w-4 h-4 rounded accent-cyan-500" />
            <label htmlFor="autoAds" className="text-sm dark:text-slate-300 text-slate-700">
              تفعيل Auto Ads (جوجل يضع الإعلانات تلقائياً في أفضل أماكن الصفحة)
            </label>
          </div>
        </div>
      </motion.div>

      {/* Ad Slots */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6">
        <h2 className="font-bold dark:text-white text-slate-900 mb-4 flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-cyan-400" /> معرّفات وحدات الإعلانات (Ad Units)
        </h2>
        <div className="space-y-4">
          {[
            { key: "adSlotTop" as const, label: "إعلان الرأس (Top Banner)", placeholder: "XXXXXXXXXX" },
            { key: "adSlotSide" as const, label: "إعلان الجانب (Sidebar)", placeholder: "XXXXXXXXXX" },
            { key: "adSlotBottom" as const, label: "إعلان الذيل (Bottom)", placeholder: "XXXXXXXXXX" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">{label}</label>
              <input value={settings[key] ?? ""} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                placeholder={placeholder} dir="ltr"
                className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 w-full font-mono" />
            </div>
          ))}
        </div>
      </motion.div>

      {/* How to get AdSense */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6">
        <h2 className="font-bold dark:text-white text-slate-900 mb-3">📋 خطوات التفعيل</h2>
        <ol className="space-y-2 text-sm dark:text-slate-400 text-slate-600">
          {[
            "اذهب إلى adsense.google.com وأنشئ حساباً أو سجّل دخولك",
            "أضف موقعك وانتظر الموافقة من Google (قد تستغرق أياماً)",
            "بعد الموافقة، انسخ Publisher ID (ca-pub-XXXX) والصقه أعلاه",
            "أنشئ Ad Units من AdSense → Ads → By ad unit وانسخ معرفات الوحدات",
            "فعّل AdSense من الأعلى وسيبدأ ظهور الإعلانات فوراً",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full gradient-bg text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </motion.div>

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center py-3 text-base">
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
        {saving ? "جاري الحفظ..." : saved ? "تم الحفظ ✓" : "حفظ إعدادات AdSense"}
      </button>
    </div>
  );
}
