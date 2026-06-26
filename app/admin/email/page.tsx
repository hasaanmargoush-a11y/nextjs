"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Save, TestTube2, Loader2, CheckCircle, Server, Lock, User, Send } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface EmailSettings {
  host: string; port: number; secure: boolean;
  user: string; pass: string; fromName: string; fromEmail: string; enabled: boolean;
}

export default function AdminEmailPage() {
  const [settings, setSettings] = useState<EmailSettings>({
    host: "smtp.gmail.com", port: 587, secure: false,
    user: "", pass: "", fromName: "منصة نوفيل", fromEmail: "", enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<EmailSettings>("/admin/settings/email")
      .then(d => setSettings(s => ({ ...s, ...d })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/admin/settings/email", settings);
      toast.success("تم حفظ إعدادات البريد بنجاح");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) { toast.error("أدخل بريد الاختبار"); return; }
    setTesting(true);
    try {
      await api.post("/admin/settings/email/test", { to: testEmail });
      toast.success("تم إرسال بريد الاختبار بنجاح ✓");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الإرسال — تحقق من الإعدادات");
    } finally {
      setTesting(false);
    }
  };

  const presets = [
    { label: "Gmail", host: "smtp.gmail.com", port: 587, secure: false },
    { label: "Hostinger", host: "smtp.hostinger.com", port: 465, secure: true },
    { label: "Outlook", host: "smtp-mail.outlook.com", port: 587, secure: false },
    { label: "Yahoo", host: "smtp.mail.yahoo.com", port: 465, secure: true },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black dark:text-white text-slate-900">إعدادات البريد الإلكتروني</h1>
          <p className="dark:text-slate-400 text-slate-600 text-sm">ضبط SMTP لإرسال OTP والإشعارات والشهادات</p>
        </div>
      </div>

      {/* Enable toggle */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold dark:text-white text-slate-900">تفعيل إرسال البريد الإلكتروني</p>
            <p className="dark:text-slate-400 text-slate-600 text-sm mt-0.5">
              عند التفعيل سيتم إرسال OTP وإشعارات الشهادات والإنجازات تلقائياً
            </p>
          </div>
          <button
            onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
            className={`relative w-14 h-7 rounded-full transition-all ${settings.enabled ? "bg-cyan-500" : "dark:bg-white/10 bg-slate-200"}`}
          >
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${settings.enabled ? "right-1" : "left-1"}`} />
          </button>
        </div>
      </motion.div>

      {/* SMTP Presets */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 mb-6">
        <h2 className="font-bold dark:text-white text-slate-900 mb-3 flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" /> اختر مزود البريد
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {presets.map(p => (
            <button key={p.label}
              onClick={() => setSettings(s => ({ ...s, host: p.host, port: p.port, secure: p.secure }))}
              className={`p-3 rounded-xl border text-sm font-semibold transition-all
                ${settings.host === p.host
                  ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                  : "dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-600 hover:border-cyan-500/50"
                }`}>
              {p.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* SMTP Settings */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 mb-6">
        <h2 className="font-bold dark:text-white text-slate-900 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-cyan-400" /> إعدادات SMTP
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">SMTP Host</label>
            <input value={settings.host} onChange={e => setSettings(s => ({ ...s, host: e.target.value }))}
              className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 w-full" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">Port</label>
            <input type="number" value={settings.port} onChange={e => setSettings(s => ({ ...s, port: Number(e.target.value) }))}
              className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 w-full" dir="ltr" />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">
              البريد الإلكتروني (SMTP User)
            </label>
            <input type="email" value={settings.user} onChange={e => setSettings(s => ({ ...s, user: e.target.value }))}
              placeholder="your@gmail.com"
              className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 w-full" dir="ltr" />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">
              كلمة المرور / App Password
            </label>
            <input type="password" value={settings.pass} onChange={e => setSettings(s => ({ ...s, pass: e.target.value }))}
              placeholder="••••••••••••••••"
              className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 w-full" dir="ltr" />
            <p className="text-xs dark:text-slate-500 text-slate-400 mt-1">
              لـ Gmail: اذهب لـ Google Account → Security → App Passwords وأنشئ كلمة مرور للتطبيق
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">اسم المرسل</label>
            <input value={settings.fromName} onChange={e => setSettings(s => ({ ...s, fromName: e.target.value }))}
              className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">بريد المرسل (From)</label>
            <input type="email" value={settings.fromEmail} onChange={e => setSettings(s => ({ ...s, fromEmail: e.target.value }))}
              placeholder="noreply@nouvil.com"
              className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 w-full" dir="ltr" />
          </div>

          <div className="col-span-2 flex items-center gap-3">
            <input type="checkbox" id="secure" checked={settings.secure} onChange={e => setSettings(s => ({ ...s, secure: e.target.checked }))}
              className="w-4 h-4 rounded accent-cyan-500" />
            <label htmlFor="secure" className="text-sm dark:text-slate-300 text-slate-700">
              SSL/TLS (للـ port 465 أو عند اشتراط التشفير)
            </label>
          </div>
        </div>
      </motion.div>

      {/* Test Email */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 mb-6">
        <h2 className="font-bold dark:text-white text-slate-900 mb-4 flex items-center gap-2">
          <TestTube2 className="w-4 h-4 text-cyan-400" /> اختبار الإرسال
        </h2>
        <div className="flex gap-3">
          <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)}
            placeholder="أدخل بريد الاختبار" dir="ltr"
            className="input-field flex-1 dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900" />
          <button onClick={handleTest} disabled={testing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors disabled:opacity-60">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            إرسال اختبار
          </button>
        </div>
      </motion.div>

      <button onClick={handleSave} disabled={saving}
        className="btn-primary w-full justify-center py-3 text-base">
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
        {saving ? "جاري الحفظ..." : saved ? "تم الحفظ ✓" : "حفظ الإعدادات"}
      </button>
    </div>
  );
}
