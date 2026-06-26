"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Code2, Loader2, Mail, ArrowLeft, CheckCircle2, Send } from "lucide-react";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("يرجى إدخال البريد الإلكتروني"); return; }

    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/3 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="dark:bg-[#111827] bg-white rounded-3xl border dark:border-white/10 border-slate-200 shadow-2xl dark:shadow-black/50 p-8">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-extrabold gradient-text">نوفيل</span>
            </Link>

            <AnimatePresence mode="wait">
              {sent ? (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                  <h1 className="text-2xl font-black dark:text-white text-slate-900 mb-2">تم الإرسال!</h1>
                  <p className="dark:text-slate-400 text-slate-600 text-sm leading-relaxed">
                    إذا كان البريد مسجلاً لدينا، ستصل رسالة تحتوي على كود التحقق إلى<br />
                    <span className="font-semibold text-cyan-400" dir="ltr">{email}</span>
                  </p>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h1 className="text-2xl font-black dark:text-white text-slate-900 mb-2">نسيت كلمة المرور؟</h1>
                  <p className="dark:text-slate-400 text-slate-600 text-sm leading-relaxed">
                    أدخل بريدك الإلكتروني وسنرسل لك كوداً لاستعادة حسابك
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="actions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <button
                  onClick={() => router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`)}
                  className="btn-primary w-full justify-center py-3 text-base"
                >
                  <ArrowLeft className="w-5 h-5" />
                  أدخل كود التحقق
                </button>
                <button
                  onClick={() => setSent(false)}
                  className="w-full py-3 text-sm dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors"
                >
                  استخدام بريد آخر
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <div>
                  <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-2">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900"
                    dir="ltr"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-3 text-base"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {loading ? "جاري الإرسال..." : "إرسال كود الاستعادة"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="text-center dark:text-slate-400 text-slate-600 text-sm mt-6">
            تذكرت كلمة المرور؟{" "}
            <Link href="/auth/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
