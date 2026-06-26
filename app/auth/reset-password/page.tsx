"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Code2, Loader2, Eye, EyeOff, KeyRound,
  CheckCircle, XCircle, CheckCircle2, RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";

const STRONG_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]).{8,}$/;

const requirements = [
  { label: "8 أحرف على الأقل", test: (p: string) => p.length >= 8 },
  { label: "حرف كبير (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "حرف صغير (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "رقم (0-9)", test: (p: string) => /\d/.test(p) },
  { label: "رمز خاص (!@#$...)", test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(p) },
];

function getStrength(p: string) {
  if (!p) return { score: 0, label: "", color: "", text: "" };
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[a-z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(p)) score++;
  if (p.length >= 12) score++;
  if (score <= 2) return { score, label: "ضعيف", color: "bg-red-500", text: "text-red-500" };
  if (score <= 4) return { score, label: "متوسط", color: "bg-amber-500", text: "text-amber-500" };
  return { score, label: "قوي", color: "bg-green-500", text: "text-green-500" };
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const router = useRouter();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(120);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const strength = getStrength(newPassword);
  const strengthPercent = Math.min(100, (strength.score / 6) * 100);

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) setOtp(text.split(""));
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/auth/forgot-password", { email });
      toast.success("تم إرسال كود جديد على بريدك");
      setCountdown(120);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل إرسال الكود");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { toast.error("أدخل كود التحقق المكون من 6 أرقام"); return; }
    if (!STRONG_RE.test(newPassword)) {
      toast.error("كلمة المرور لا تستوفي متطلبات القوة"); return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين"); return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { email, otp: code, newPassword });
      setSuccess(true);
      toast.success("تم تغيير كلمة المرور بنجاح!");
      setTimeout(() => router.push("/auth/login"), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold dark:text-white text-slate-900 mb-2">تم تغيير كلمة المرور!</h2>
          <p className="dark:text-slate-400 text-slate-600">جاري تحويلك لصفحة تسجيل الدخول...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="dark:bg-[#111827] bg-white rounded-3xl border dark:border-white/10 border-slate-200 shadow-2xl dark:shadow-black/50 p-8">
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-extrabold gradient-text">نوفيل</span>
            </Link>

            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-violet-400" />
            </div>
            <h1 className="text-2xl font-black dark:text-white text-slate-900 mb-2">إعادة تعيين كلمة المرور</h1>
            <p className="dark:text-slate-400 text-slate-600 text-sm">
              أدخل الكود المرسل إلى{" "}
              <span className="text-cyan-400 font-semibold" dir="ltr">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* OTP Input */}
            <div>
              <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-3 text-center">
                كود التحقق (6 أرقام)
              </label>
              <div className="flex gap-2 justify-center flex-row-reverse" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className={`w-11 h-13 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none
                      dark:bg-white/5 bg-slate-50 dark:text-white text-slate-900
                      ${digit
                        ? "border-violet-500 dark:bg-violet-500/10 bg-violet-50"
                        : "dark:border-white/10 border-slate-200 focus:border-violet-500"
                      }`}
                    style={{ height: "52px" }}
                    dir="ltr"
                  />
                ))}
              </div>
              <div className="text-center mt-2">
                {countdown > 0 ? (
                  <p className="text-xs dark:text-slate-500 text-slate-400">
                    إعادة إرسال بعد <span className="text-cyan-400 font-semibold">{countdown}</span>ث
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 mx-auto transition-colors"
                  >
                    {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    {resending ? "جاري الإرسال..." : "إرسال كود جديد"}
                  </button>
                )}
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-2">
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 pl-10"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-400 text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength meter */}
              {newPassword && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 space-y-2"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs dark:text-slate-400 text-slate-500">قوة كلمة المرور</span>
                    <span className={`text-xs font-semibold ${strength.text}`}>{strength.label}</span>
                  </div>
                  <div className="h-1.5 dark:bg-white/10 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${strength.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${strengthPercent}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    {requirements.map((req) => {
                      const met = req.test(newPassword);
                      return (
                        <div key={req.label} className="flex items-center gap-1">
                          {met
                            ? <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                            : <XCircle className="w-3 h-3 text-slate-400 shrink-0" />
                          }
                          <span className={`text-xs ${met ? "text-green-500" : "dark:text-slate-500 text-slate-400"}`}>
                            {req.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-2">
                تأكيد كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`input-field dark:bg-white/5 bg-slate-50 dark:text-white text-slate-900 pl-10 transition-colors
                    ${confirmPassword && newPassword !== confirmPassword
                      ? "border-red-500 dark:border-red-500"
                      : confirmPassword && newPassword === confirmPassword
                      ? "border-green-500 dark:border-green-500"
                      : "dark:border-white/10 border-slate-200"
                    }`}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-400 text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-red-400 text-xs mt-1">كلمتا المرور غير متطابقتين</p>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <p className="text-green-400 text-xs mt-1">✓ كلمتا المرور متطابقتان</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || otp.some((d) => !d) || !STRONG_RE.test(newPassword) || newPassword !== confirmPassword}
              className="btn-primary w-full justify-center py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
              {loading ? "جاري الحفظ..." : "تغيير كلمة المرور"}
            </button>
          </form>

          <p className="text-center dark:text-slate-400 text-slate-600 text-sm mt-6">
            <Link href="/auth/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
              ← العودة لتسجيل الدخول
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
