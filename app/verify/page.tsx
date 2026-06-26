"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shield, Search, Award, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VerifyPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError("أدخل رمز الشهادة"); return; }
    setError("");
    startTransition(() => {
      router.push(`/verify/${trimmed}`);
    });
  };

  return (
    <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex flex-col items-center justify-center p-4">

      {/* Back to home */}
      <Link href="/" className="absolute top-6 right-6 flex items-center gap-2 text-sm dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors">
        <ArrowLeft className="w-4 h-4 rotate-180" />
        الرئيسية
      </Link>

      {/* Card */}
      <div className="w-full max-w-md">
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-10 h-10 text-cyan-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 dark:border-[#0a0f1e] border-slate-50 flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-black dark:text-white text-slate-900 text-center mb-2">
          التحقق من الشهادة
        </h1>
        <p className="text-sm dark:text-slate-400 text-slate-600 text-center mb-8">
          أدخل رمز الشهادة الفريد للتحقق من صحتها وصاحبها
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 mb-2">
              رمز الشهادة
            </label>
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
                placeholder="مثال: A1B2C3D4E5F6G7H8"
                dir="ltr"
                className="w-full px-4 py-3 pr-11 rounded-xl text-sm font-mono tracking-widest
                  dark:bg-[#111827] bg-white
                  dark:border-[#1f2937] border-slate-200 border
                  dark:text-white text-slate-900
                  dark:placeholder-slate-600 placeholder-slate-400
                  focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500
                  transition-all uppercase"
                autoFocus
                spellCheck={false}
                autoComplete="off"
              />
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-slate-500 text-slate-400" />
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                <span>{error}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending || !code.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500
              text-white font-bold text-sm
              hover:opacity-90 active:scale-[0.98]
              transition-all shadow-lg shadow-cyan-500/20
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" />جاري التحقق...</>
              : <><Shield className="w-4 h-4" />تحقق من الشهادة</>
            }
          </button>
        </form>

        {/* Info boxes */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            { icon: Shield, label: "موثوقة", desc: "شهادات معتمدة" },
            { icon: Award, label: "فورية", desc: "نتيجة آنية" },
            { icon: CheckCircle, label: "مجانية", desc: "للجميع" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="text-center p-3 rounded-xl dark:bg-[#111827]/60 bg-white border dark:border-[#1f2937] border-slate-200">
              <Icon className="w-5 h-5 text-cyan-400 mx-auto mb-1.5" />
              <p className="text-xs font-bold dark:text-white text-slate-900">{label}</p>
              <p className="text-[10px] dark:text-slate-500 text-slate-400">{desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs dark:text-slate-600 text-slate-400">
          منصة{" "}
          <span className="text-cyan-400 font-bold">نوفيل</span>
          {" "}للتعليم البرمجي — جميع الشهادات موثقة رقمياً
        </p>
      </div>
    </div>
  );
}
