"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Code2, Loader2, Mail, RefreshCw, CheckCircle2 } from "lucide-react";
import { api, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface OtpResponse { user: { id: number; email: string; name: string; role: string; [key: string]: unknown }; token: string }

function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const router = useRouter();
  const { updateUser } = useAuth();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    if (newOtp.every(d => d) && digit) {
      handleSubmit(newOtp.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(""));
      handleSubmit(text);
    }
  };

  const handleSubmit = async (code?: string) => {
    const finalOtp = code ?? otp.join("");
    if (finalOtp.length < 6) { toast.error("أدخل الكود المكون من 6 أرقام"); return; }
    setLoading(true);
    try {
      const data = await api.post<OtpResponse>("/auth/verify-otp", { email, otp: finalOtp });
      setVerified(true);
      localStorage.setItem("nouvil_token", data.token);
      localStorage.setItem("nouvil_user", JSON.stringify(data.user));
      updateUser(data.user as unknown as User);
      toast.success("تم التحقق بنجاح! مرحباً بك في نوفيل 🎉");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "كود غير صحيح");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/auth/resend-otp", { email });
      toast.success("تم إرسال كود جديد على بريدك");
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل إرسال الكود");
    } finally {
      setResending(false);
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold dark:text-white text-slate-900 mb-2">تم التحقق بنجاح!</h2>
          <p className="dark:text-slate-400 text-slate-600">جاري تحويلك للداشبورد...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative w-full max-w-md">
        <div className="dark:bg-[#111827] bg-white rounded-3xl border dark:border-white/10 border-slate-200 shadow-2xl dark:shadow-black/50 p-8">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-extrabold gradient-text">نوفيل</span>
            </Link>

            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-black dark:text-white text-slate-900 mb-2">تأكيد البريد الإلكتروني</h1>
            <p className="dark:text-slate-400 text-slate-600 text-sm leading-relaxed">
              تم إرسال كود التحقق إلى<br />
              <span className="font-semibold text-cyan-400" dir="ltr">{email}</span>
            </p>
          </div>

          <div className="flex gap-3 justify-center mb-6 flex-row-reverse" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all outline-none
                  dark:bg-white/5 bg-slate-50 dark:text-white text-slate-900
                  ${digit
                    ? "border-cyan-500 dark:bg-cyan-500/10 bg-cyan-50"
                    : "dark:border-white/10 border-slate-200 focus:border-cyan-500"
                  }`}
                dir="ltr"
              />
            ))}
          </div>

          <button
            onClick={() => handleSubmit()}
            disabled={loading || otp.some(d => !d)}
            className="btn-primary w-full justify-center py-3 text-base mb-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {loading ? "جاري التحقق..." : "تأكيد الكود"}
          </button>

          <div className="text-center">
            {countdown > 0 ? (
              <p className="dark:text-slate-400 text-slate-600 text-sm">
                يمكنك طلب كود جديد بعد{" "}
                <span className="text-cyan-400 font-semibold">{countdown}</span> ثانية
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-semibold mx-auto transition-colors"
              >
                {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {resending ? "جاري الإرسال..." : "إرسال كود جديد"}
              </button>
            )}
          </div>

          <p className="text-center dark:text-slate-400 text-slate-600 text-sm mt-6">
            <Link href="/auth/register" className="text-cyan-400 hover:text-cyan-300 font-semibold">
              ← العودة للتسجيل
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    }>
      <VerifyOtpContent />
    </Suspense>
  );
}
