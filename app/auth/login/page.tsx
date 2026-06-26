"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Code2, LogIn, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

const schema = z.object({
  email: z.string().email("بريد إلكتروني غير صحيح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      toast.success("تم تسجيل الدخول بنجاح!");
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "بيانات غير صحيحة";
      // If email not verified → redirect to OTP page
      if (msg === "email_not_verified") {
        toast.info("يرجى تأكيد بريدك الإلكتروني أولاً — تم إرسال كود جديد");
        router.push(`/auth/verify-otp?email=${encodeURIComponent(data.email)}`);
        return;
      }
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
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
            <h1 className="text-2xl font-black dark:text-white text-slate-900 mb-2">مرحباً بعودتك!</h1>
            <p className="dark:text-slate-400 text-slate-600 text-sm">سجل دخولك لمتابعة رحلتك التعليمية</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-2">البريد الإلكتروني</label>
              <input
                {...register("email")}
                type="email"
                placeholder="example@email.com"
                className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900"
                dir="ltr"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-2">كلمة المرور</label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 pl-10"
                  dir="ltr"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-400 text-slate-400 hover:text-cyan-400 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex justify-end">
              <Link href="/auth/forgot-password" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                نسيت كلمة المرور؟
              </Link>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-3 text-base">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {isSubmitting ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </button>
          </form>

          <p className="text-center dark:text-slate-400 text-slate-600 text-sm mt-6">
            ليس لديك حساب؟{" "}
            <Link href="/auth/register" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
              إنشاء حساب جديد
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
