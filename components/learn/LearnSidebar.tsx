"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronLeft, Menu, X, BookOpen } from "lucide-react";

interface TopicItem {
  id: number;
  slug: string;
  titleAr: string;
  order: number;
}

interface ChapterItem {
  id: number;
  slug: string;
  titleAr: string;
  order: number;
  topics: TopicItem[];
}

interface LanguageData {
  id: number;
  slug: string;
  nameAr: string;
  nameEn: string;
  color: string;
  icon: string | null;
}

interface Props {
  language: LanguageData;
  chapters: ChapterItem[];
  uncategorized: TopicItem[];
  currentSlug: string;
}

const LANG_ABBR: Record<string, string> = {
  html: "HTML", css: "CSS", javascript: "JS", python: "PY",
  php: "PHP", react: "RE", nextjs: "NX", typescript: "TS",
  sql: "SQL", java: "JV", csharp: "C#", cpp: "C++",
};

export default function LearnSidebar({ language, chapters, uncategorized, currentSlug }: Props) {
  const pathname = usePathname();
  const [openChapters, setOpenChapters] = useState<Record<number, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const initial: Record<number, boolean> = {};
    chapters.forEach((ch) => {
      initial[ch.id] = ch.topics.some((t) => t.slug === currentSlug) || ch.order === chapters[0]?.order;
    });
    setOpenChapters(initial);
  }, [chapters, currentSlug]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleChapter = (id: number) => {
    setOpenChapters((p) => ({ ...p, [id]: !p[id] }));
  };

  const abbr = LANG_ABBR[language.slug] ?? language.nameEn.slice(0, 3).toUpperCase();

  const navContent = (
    <div className="flex flex-col h-full">
      <Link
        href={`/learn/${language.slug}`}
        className="flex items-center gap-3 p-4 border-b dark:border-white/10 border-slate-200 hover:dark:bg-white/5 hover:bg-slate-50 transition-colors"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 shadow-md"
          style={{ background: language.color }}
        >
          {abbr}
        </div>
        <div>
          <p className="font-bold dark:text-white text-slate-900 text-sm">{language.nameAr}</p>
          <p className="text-xs dark:text-slate-500 text-slate-400">دليل مرجعي شامل</p>
        </div>
      </Link>

      <nav ref={navRef} className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {chapters.map((ch) => {
          const isOpen = openChapters[ch.id];
          const hasActive = ch.topics.some((t) => t.slug === currentSlug);
          return (
            <div key={ch.id}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  const scrollTop = navRef.current?.scrollTop ?? 0;
                  toggleChapter(ch.id);
                  requestAnimationFrame(() => {
                    if (navRef.current) navRef.current.scrollTop = scrollTop;
                  });
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                  hasActive
                    ? "dark:text-cyan-400 text-cyan-600"
                    : "dark:text-slate-500 text-slate-400 hover:dark:text-slate-300 hover:text-slate-600"
                }`}
              >
                <span>{ch.titleAr}</span>
                {isOpen ? <ChevronDown size={12} /> : <ChevronLeft size={12} />}
              </button>
              {isOpen && (
                <div className="mr-2 pr-2 border-r dark:border-white/5 border-slate-200 space-y-0.5 mt-0.5 mb-1">
                  {ch.topics.map((t) => {
                    const isActive = t.slug === currentSlug;
                    return (
                      <Link
                        key={t.id}
                        href={`/learn/${language.slug}/${t.slug}`}
                        className={`block px-3 py-1.5 text-sm rounded-lg transition-all duration-150 ${
                          isActive
                            ? "gradient-bg text-white font-semibold shadow-sm"
                            : "dark:text-slate-400 text-slate-600 hover:dark:text-white hover:text-slate-900 hover:dark:bg-white/5 hover:bg-slate-100"
                        }`}
                      >
                        {t.titleAr}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {uncategorized.length > 0 && (
          <div>
            {chapters.length > 0 && (
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider dark:text-slate-500 text-slate-400">
                مواضيع عامة
              </p>
            )}
            <div className="space-y-0.5">
              {uncategorized.map((t) => {
                const isActive = t.slug === currentSlug;
                return (
                  <Link
                    key={t.id}
                    href={`/learn/${language.slug}/${t.slug}`}
                    className={`block px-3 py-1.5 text-sm rounded-lg transition-all duration-150 ${
                      isActive
                        ? "gradient-bg text-white font-semibold shadow-sm"
                        : "dark:text-slate-400 text-slate-600 hover:dark:text-white hover:text-slate-900 hover:dark:bg-white/5 hover:bg-slate-100"
                    }`}
                  >
                    {t.titleAr}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <div className="p-3 border-t dark:border-white/10 border-slate-200">
        <Link
          href="/learn"
          className="flex items-center gap-2 px-3 py-2 text-xs dark:text-slate-500 text-slate-400 hover:dark:text-slate-300 hover:text-slate-600 rounded-lg hover:dark:bg-white/5 hover:bg-slate-100 transition-colors"
        >
          <BookOpen size={13} />
          كل اللغات
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-6 left-6 z-50 gradient-bg text-white rounded-full w-12 h-12 flex items-center justify-center shadow-xl"
      >
        <Menu size={18} />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 dark:bg-[#0a0f1e] bg-white border-r dark:border-white/10 border-slate-200 h-full overflow-hidden flex flex-col shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 left-3 z-10 dark:text-slate-400 text-slate-500 hover:dark:text-white"
            >
              <X size={18} />
            </button>
            {navContent}
          </div>
        </div>
      )}

      <aside className="hidden lg:flex flex-col w-60 xl:w-64 shrink-0 h-[calc(100vh-64px)] sticky top-16 border-l dark:border-white/10 border-slate-200 dark:bg-[#070b14]/60 bg-white/80 backdrop-blur-xl overflow-hidden">
        {navContent}
      </aside>
    </>
  );
}
