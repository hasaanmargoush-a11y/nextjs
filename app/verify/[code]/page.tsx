"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { Shield, CheckCircle, XCircle, Award, Loader2, ArrowLeft, Star, ExternalLink, User, BookOpen, Calendar, Hash } from "lucide-react";
import Link from "next/link";

interface CertData {
  uniqueCode: string;
  issuedAt: string;
  courseTitle: string;
  certTitle: string;
  certDescription?: string | null;
  certType: string;
  userName: string;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
}

export default function VerifyCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [cert, setCert] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/certificates/verify/${encodeURIComponent(code.toUpperCase())}`)
      .then(r => {
        if (!r.ok) throw new Error("not found");
        return r.json() as Promise<CertData>;
      })
      .then(data => setCert(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [code]);

  const issuedDate = cert
    ? new Date(cert.issuedAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
    : "";

  return (
    <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex flex-col items-center justify-center p-4">

      {/* Back */}
      <Link href="/verify" className="absolute top-6 right-6 flex items-center gap-2 text-sm dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors">
        <ArrowLeft className="w-4 h-4 rotate-180" />
        التحقق من شهادة أخرى
      </Link>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
          <p className="text-sm dark:text-slate-400 text-slate-500">جاري التحقق من الشهادة...</p>
        </div>
      )}

      {/* Not found */}
      {!loading && notFound && (
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
          </div>
          <h1 className="text-xl font-black dark:text-white text-slate-900 mb-2">شهادة غير موجودة</h1>
          <p className="text-sm dark:text-slate-400 text-slate-500 mb-2">
            لم يتم العثور على شهادة بالرمز:
          </p>
          <p className="font-mono text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg inline-block mb-6">
            {code.toUpperCase()}
          </p>
          <p className="text-xs dark:text-slate-500 text-slate-400 mb-8">
            تأكد من نسخ الرمز كاملاً بدون أخطاء
          </p>
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold text-sm hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4 rotate-180" />
            حاول مرة أخرى
          </Link>
        </div>
      )}

      {/* Found */}
      {!loading && cert && (
        <div className="w-full max-w-lg">

          {/* Verified badge */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/40 flex items-center justify-center shadow-lg shadow-green-500/10">
                <Shield className="w-10 h-10 text-green-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-2 dark:border-[#0a0f1e] border-slate-50 flex items-center justify-center shadow-md">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-black text-center dark:text-white text-slate-900 mb-1">
            شهادة موثقة
          </h1>
          <p className="text-sm text-center text-green-400 font-semibold mb-8">
            تم التحقق من صحة هذه الشهادة بنجاح
          </p>

          {/* Certificate card */}
          <div className="rounded-2xl overflow-hidden border dark:border-[#1f2937] border-slate-200 shadow-xl dark:shadow-none mb-4">

            {/* Card header */}
            <div style={{ background: "linear-gradient(135deg,#060d1f 0%,#0a1628 40%,#0d2444 100%)" }} className="p-6 text-center border-b border-white/10">
              <div className="flex items-center justify-center gap-2 mb-3">
                {[0,1,2,3,4].map(i => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
              </div>
              <p className="text-cyan-400/70 text-xs font-bold tracking-widest uppercase mb-2">
                Certificate of Completion · شهادة إتمام
              </p>
              <h2 className="text-white text-xl font-black mb-1">{cert.certTitle}</h2>
              {cert.certDescription && (
                <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">{cert.certDescription}</p>
              )}
            </div>

            {/* Details */}
            <div className="dark:bg-[#111827] bg-white p-6 space-y-4">

              {/* Recipient */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl dark:bg-[#0a0f1e]/60 bg-slate-50 border dark:border-[#1f2937] border-slate-200">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4.5 h-4.5 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs dark:text-slate-500 text-slate-400 mb-0.5">صاحب الشهادة</p>
                  <p className="font-bold dark:text-white text-slate-900 truncate">{cert.userName}</p>
                </div>
              </div>

              {/* Course */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl dark:bg-[#0a0f1e]/60 bg-slate-50 border dark:border-[#1f2937] border-slate-200">
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4.5 h-4.5 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs dark:text-slate-500 text-slate-400 mb-0.5">الكورس المُكتمَل</p>
                  <p className="font-bold dark:text-white text-slate-900 truncate">{cert.courseTitle}</p>
                </div>
              </div>

              {/* Date + Type row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3.5 rounded-xl dark:bg-[#0a0f1e]/60 bg-slate-50 border dark:border-[#1f2937] border-slate-200">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4.5 h-4.5 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs dark:text-slate-500 text-slate-400 mb-0.5">تاريخ الإصدار</p>
                    <p className="font-bold dark:text-white text-slate-900 text-sm">{issuedDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3.5 rounded-xl dark:bg-[#0a0f1e]/60 bg-slate-50 border dark:border-[#1f2937] border-slate-200">
                  <div className="w-9 h-9 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Award className="w-4.5 h-4.5 text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs dark:text-slate-500 text-slate-400 mb-0.5">نوع الشهادة</p>
                    <p className="font-bold dark:text-white text-slate-900 text-sm">
                      {cert.certType === "course" ? "إتمام كورس" : "إتمام مرحلة"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Signatory */}
              {cert.signatoryName && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl dark:bg-[#0a0f1e]/60 bg-slate-50 border dark:border-[#1f2937] border-slate-200">
                  <div className="w-9 h-9 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4.5 h-4.5 dark:text-slate-400 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs dark:text-slate-500 text-slate-400 mb-0.5">الموقِّع</p>
                    <p className="font-bold dark:text-white text-slate-900">{cert.signatoryName}</p>
                    {cert.signatoryTitle && <p className="text-xs dark:text-slate-400 text-slate-500">{cert.signatoryTitle}</p>}
                  </div>
                </div>
              )}

              {/* Unique code */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl dark:bg-[#0a0f1e]/60 bg-slate-50 border dark:border-[#1f2937] border-slate-200">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <Hash className="w-4.5 h-4.5 text-cyan-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs dark:text-slate-500 text-slate-400 mb-0.5">رمز التحقق الفريد</p>
                  <p className="font-mono text-sm text-cyan-400 font-bold tracking-wide break-all">{cert.uniqueCode}</p>
                </div>
              </div>
            </div>

            {/* Card footer */}
            <div className="dark:bg-[#0d1526] bg-slate-100 px-6 py-4 flex items-center justify-between border-t dark:border-[#1f2937] border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-green-400 font-semibold">شهادة أصلية موثقة</span>
              </div>
              <span className="text-xs dark:text-slate-500 text-slate-400 font-semibold">Nouvil Platform</span>
            </div>
          </div>

          {/* Share / verify another */}
          <div className="flex gap-3">
            <Link
              href="/verify"
              className="flex-1 py-3 rounded-xl border dark:border-[#1f2937] border-slate-200 dark:text-slate-300 text-slate-700 font-semibold text-sm text-center hover:border-cyan-500/50 transition-colors flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" />
              تحقق من شهادة أخرى
            </Link>
            <button
              onClick={() => {
                const url = window.location.href;
                if (navigator.share) {
                  navigator.share({ title: `شهادة ${cert.userName}`, url });
                } else {
                  navigator.clipboard.writeText(url);
                }
              }}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              مشاركة الرابط
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
