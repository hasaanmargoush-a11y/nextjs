import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "مدرسة البرمجة بالعربي — مرجع شامل لكل لغات البرمجة",
  description: "مرجع عربي شامل لتعلم البرمجة: HTML, CSS, JavaScript, Python وأكثر — شرح مفصل لكل خاصية مع أمثلة تفاعلية",
};

interface SchoolLanguage {
  id: number;
  slug: string;
  nameAr: string;
  nameEn: string;
  icon: string | null;
  color: string;
  description: string | null;
  topicsCount: number;
}

const LANG_ABBR: Record<string, string> = {
  html: "HTML", css: "CSS", javascript: "JS", python: "PY",
  php: "PHP", react: "RE", nextjs: "NX", typescript: "TS",
  sql: "SQL", java: "JV", csharp: "C#", cpp: "C++",
};

async function getLanguages(): Promise<SchoolLanguage[]> {
  try {
    const baseUrl = process.env.INTERNAL_API_URL ?? "http://localhost:8080";
    const res = await fetch(`${baseUrl}/api/school/languages`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function LearnPage() {
  const languages = await getLanguages();

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-14">

        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 dark:bg-cyan-500/10 bg-cyan-50 text-cyan-600 dark:text-cyan-400 border dark:border-cyan-500/20 border-cyan-200 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
            <Lock size={13} />
            <span>مفتوح للجميع — بدون تسجيل دخول</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black dark:text-white text-slate-900 mb-4 leading-tight">
            مدرسة البرمجة{" "}
            <span className="gradient-text">بالعربي</span>
          </h1>
          <p className="text-base md:text-lg dark:text-slate-400 text-slate-600 max-w-2xl mx-auto leading-relaxed">
            مرجع عربي شامل لكل لغات البرمجة — شرح مفصل لكل خاصية مع أمثلة عملية تقدر تجربها فوراً
          </p>
        </div>

        {languages.length === 0 ? (
          <div className="text-center dark:text-slate-500 text-slate-400 py-24 border border-dashed dark:border-white/10 border-slate-200 rounded-2xl">
            <BookOpen size={40} className="mx-auto mb-4 opacity-30" />
            <p>لا توجد لغات منشورة حتى الآن</p>
            <p className="text-sm mt-1 opacity-60">يمكن إضافة لغات من لوحة الإدارة</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {languages.map((lang) => {
              const abbr = LANG_ABBR[lang.slug] ?? lang.nameEn.slice(0, 3).toUpperCase();
              return (
                <Link
                  key={lang.id}
                  href={`/learn/${lang.slug}`}
                  className="group relative dark:bg-white/[0.03] bg-white border dark:border-white/10 border-slate-200 rounded-2xl p-6 hover:dark:border-white/20 hover:border-slate-300 dark:hover:bg-white/[0.05] hover:shadow-lg hover:shadow-black/10 transition-all duration-300 overflow-hidden"
                >
                  {/* Subtle glow on hover */}
                  <div
                    className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-500 pointer-events-none"
                    style={{ background: lang.color }}
                  />

                  <div className="flex items-start gap-4">
                    {/* Language badge — no emoji, styled abbreviation */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 shadow-md"
                      style={{ background: lang.color }}
                    >
                      {abbr}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-bold dark:text-white text-slate-900 mb-1">
                        {lang.nameAr}
                      </h2>
                      <p className="text-sm dark:text-slate-400 text-slate-500 line-clamp-2 leading-relaxed">
                        {lang.description ?? `تعلم ${lang.nameAr} بالعربي مع أمثلة تفاعلية`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-5">
                    <span className="text-xs dark:text-slate-500 text-slate-400 dark:bg-white/5 bg-slate-100 rounded-full px-2.5 py-1">
                      {lang.topicsCount} موضوع
                    </span>
                    <span className="flex items-center gap-1 text-xs font-semibold gradient-text opacity-0 group-hover:opacity-100 transition-opacity">
                      ابدأ التعلم <ArrowLeft size={11} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
