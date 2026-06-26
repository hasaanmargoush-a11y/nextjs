"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Code2, UserPlus, Loader2, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/lib/api";

const STRONG_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]).{8,}$/;

const schema = z
  .object({
    name: z.string().min(3, "الاسم يجب أن يكون 3 أحرف على الأقل"),
    username: z
      .string()
      .min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل")
      .regex(/^[a-z0-9_]+$/, "يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطة سفلية فقط"),
    email: z.string().email("بريد إلكتروني غير صحيح"),
    password: z
      .string()
      .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
      .regex(STRONG_RE, "كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم ورمز خاص"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

interface StrengthInfo {
  score: number;
  label: string;
  color: string;
  bgColor: string;
}

function getStrength(password: string): StrengthInfo {
  if (!password) return { score: 0, label: "", color: "", bgColor: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) score++;
  if (password.length >= 12) score++;

  if (score <= 2) return { score, label: "ضعيف", color: "bg-red-500", bgColor: "text-red-500" };
  if (score <= 4) return { score, label: "متوسط", color: "bg-amber-500", bgColor: "text-amber-500" };
  return { score, label: "قوي", color: "bg-green-500", bgColor: "text-green-500" };
}

const requirements = [
  { label: "8 أحرف على الأقل", test: (p: string) => p.length >= 8 },
  { label: "حرف كبير (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "حرف صغير (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "رقم (0-9)", test: (p: string) => /\d/.test(p) },
  { label: "رمز خاص (!@#$...)", test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(p) },
];

const benefits = [
  "وصول مجاني لمئات الكورسات",
  "تحديات برمجية يومية",
  "شهادات رقمية معتمدة",
  "ذكاء اصطناعي يطور مستواك",
];

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const pwd = watch("password") ?? "";
  const strength = getStrength(pwd);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const result = await api.post<{ message: string; email: string; userId: number }>(
        "/auth/register",
        { name: data.name, username: data.username, email: data.email, password: data.password }
      );
      if (result.message === "otp_sent" || result.message === "resend_otp") {
        toast.success("تم إرسال كود التحقق على بريدك الإلكتروني");
        router.push(`/auth/verify-otp?email=${encodeURIComponent(data.email)}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء إنشاء الحساب");
    } finally {
      setIsSubmitting(false);
    }
  };

  void setPasswordValue;

  return (
    <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden lg:block"
        >
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-extrabold gradient-text">نوفيل</span>
          </Link>

          <h2 className="text-4xl font-black dark:text-white text-slate-900 mb-4 leading-tight">
            انضم لمجتمع{" "}
            <span className="gradient-text">المبرمجين العرب</span>
          </h2>
          <p className="dark:text-slate-400 text-slate-600 text-lg mb-8">
            أنشئ حسابك المجاني الآن وابدأ رحلتك في تعلم البرمجة
          </p>

          <ul className="space-y-4">
            {benefits.map((b, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 dark:text-slate-300 text-slate-700"
              >
                <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                {b}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="dark:bg-[#111827] bg-white rounded-3xl border dark:border-white/10 border-slate-200 shadow-2xl dark:shadow-black/50 p-8">
            <div className="text-center mb-6 lg:hidden">
              <Link href="/" className="inline-flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-extrabold gradient-text">نوفيل</span>
              </Link>
            </div>

            <h1 className="text-2xl font-black dark:text-white text-slate-900 mb-2">إنشاء حساب جديد</h1>
            <p className="dark:text-slate-400 text-slate-600 text-sm mb-6">مجاني تماماً • يتطلب تأكيد البريد الإلكتروني</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">الاسم الكامل</label>
                  <input {...register("name")} type="text" placeholder="محمد أحمد"
                    className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900" />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">اسم المستخدم</label>
                  <input {...register("username")} type="text" placeholder="mohammedahmad" dir="ltr"
                    className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900" />
                  {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">البريد الإلكتروني</label>
                <input {...register("email")} type="email" placeholder="example@email.com" dir="ltr"
                  className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900" />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">كلمة المرور</label>
                <div className="relative">
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900 pl-10"
                    dir="ltr"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-400 text-slate-400 hover:text-cyan-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}

                {/* Strength meter */}
                {pwd.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                          style={{ width: `${(strength.score / 6) * 100}%` }}
                        />
                      </div>
                      {strength.label && (
                        <span className={`text-xs font-semibold ${strength.bgColor}`}>{strength.label}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {requirements.map((req, i) => {
                        const ok = req.test(pwd);
                        return (
                          <div key={i} className={`flex items-center gap-1 text-xs ${ok ? "text-green-500" : "dark:text-slate-500 text-slate-400"}`}>
                            {ok ? <CheckCircle className="w-3 h-3 flex-shrink-0" /> : <XCircle className="w-3 h-3 flex-shrink-0" />}
                            {req.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium dark:text-slate-300 text-slate-700 mb-1.5">تأكيد كلمة المرور</label>
                <input {...register("confirmPassword")} type="password" placeholder="••••••••" dir="ltr"
                  className="input-field dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 dark:text-white text-slate-900" />
                {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>}
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-3 text-base">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                {isSubmitting ? "جاري إنشاء الحساب..." : "إنشاء حساب والتحقق من البريد"}
              </button>
            </form>

            <p className="text-center dark:text-slate-400 text-slate-600 text-sm mt-5">
              لديك حساب؟{" "}
              <Link href="/auth/login" className="text-cyan-400 hover:text-cyan-300 font-semibold">تسجيل الدخول</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
