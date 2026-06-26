import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Lightbulb, Code2, BookOpen, Tag, Table2 } from "lucide-react";
import LearnSidebar from "@/components/learn/LearnSidebar";
import SchoolCodeBlock from "@/components/learn/SchoolCodeBlock";

interface CodeExample {
  title: string;
  code: string;
  language: string;
}

interface ReferenceTable {
  headers: string[];
  rows: string[][];
}

interface TopicDetail {
  id: number;
  slug: string;
  titleAr: string;
  conceptExplanationAr: string;
  syntaxCode: string | null;
  codeExamples: CodeExample[];
  proTipsAr: string | null;
  referenceTableJson: ReferenceTable | null;
  seoKeywords: string[];
}

interface LanguageData {
  id: number;
  slug: string;
  nameAr: string;
  nameEn: string;
  color: string;
  icon: string | null;
}

interface NavTopic {
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
  topics: NavTopic[];
}

interface PageData {
  topic: TopicDetail;
  language: LanguageData;
  prev: NavTopic | null;
  next: NavTopic | null;
}

interface SidebarData {
  language: LanguageData;
  chapters: ChapterItem[];
  uncategorized: NavTopic[];
}

const BASE = process.env.INTERNAL_API_URL ?? "http://localhost:8080";

async function getPageData(lang: string, slug: string): Promise<PageData | null> {
  try {
    const res = await fetch(`${BASE}/api/school/languages/${lang}/topics/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function getSidebarData(lang: string): Promise<SidebarData | null> {
  try {
    const res = await fetch(`${BASE}/api/school/languages/${lang}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function generateStaticParams() {
  try {
    const res = await fetch(`${BASE}/api/school/languages`, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const langs = await res.json();
    const allParams: { language: string; topicSlug: string }[] = [];
    for (const lang of langs) {
      const sRes = await fetch(`${BASE}/api/school/languages/${lang.slug}`, { next: { revalidate: 600 } });
      if (!sRes.ok) continue;
      const { chapters, uncategorized } = await sRes.json();
      const topics = [
        ...(chapters?.flatMap((c: ChapterItem) => c.topics) ?? []),
        ...(uncategorized ?? []),
      ];
      for (const t of topics) {
        allParams.push({ language: lang.slug, topicSlug: t.slug });
      }
    }
    return allParams;
  } catch { return []; }
}

export const dynamicParams = true;

interface Props {
  params: Promise<{ language: string; topicSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { language, topicSlug } = await params;
  const data = await getPageData(language, topicSlug);
  if (!data) return { title: "نوفيل School" };
  const title = `شرح ${data.topic.titleAr} في ${data.language.nameAr} بالتفصيل مع الأمثلة`;
  const description =
    data.topic.conceptExplanationAr?.slice(0, 155) ||
    `شرح مفصل لـ ${data.topic.titleAr} في ${data.language.nameAr} باللغة العربية مع أمثلة عملية`;
  return {
    title,
    description,
    keywords: data.topic.seoKeywords,
    openGraph: { title, description, type: "article" },
    alternates: { canonical: `/learn/${language}/${topicSlug}` },
  };
}

export default async function TopicPage({ params }: Props) {
  const { language, topicSlug } = await params;

  const [data, sidebarData] = await Promise.all([
    getPageData(language, topicSlug),
    getSidebarData(language),
  ]);

  if (!data || !sidebarData) notFound();

  const { topic, prev, next } = data;
  const paragraphs = topic.conceptExplanationAr.split("\n\n").filter(Boolean);

  return (
    <div className="flex min-h-[calc(100vh-64px)]" dir="rtl">
      <LearnSidebar
        language={sidebarData.language}
        chapters={sidebarData.chapters}
        uncategorized={sidebarData.uncategorized}
        currentSlug={topicSlug}
      />

      <main className="flex-1 min-w-0">
        <div className="max-w-3xl mx-auto px-5 md:px-10 py-10">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm dark:text-slate-500 text-slate-400 mb-8">
            <Link href="/learn" className="hover:dark:text-slate-200 hover:text-slate-700 transition-colors">مدرسة البرمجة</Link>
            <span>/</span>
            <Link href={`/learn/${language}`} className="hover:dark:text-slate-200 hover:text-slate-700 transition-colors">
              {sidebarData.language.nameAr}
            </Link>
            <span>/</span>
            <span className="dark:text-slate-300 text-slate-600 font-medium truncate">{topic.titleAr}</span>
          </nav>

          {/* Title */}
          <header className="mb-8 pb-8 border-b dark:border-white/10 border-slate-200">
            <h1 className="text-3xl md:text-4xl font-black dark:text-white text-slate-900 mb-4 leading-tight">
              {topic.titleAr}
            </h1>
            {topic.seoKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {topic.seoKeywords.slice(0, 6).map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1.5 text-xs dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-500 dark:border-white/10 border border-slate-200 rounded-full px-3 py-1"
                  >
                    <Tag size={9} />
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Explanation */}
          {topic.conceptExplanationAr && (
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={16} className="text-cyan-400" />
                <h2 className="text-base font-bold dark:text-white text-slate-900">الشرح</h2>
              </div>
              <div className="space-y-4">
                {paragraphs.map((p, i) => (
                  <p key={i} className="dark:text-slate-300 text-slate-600 leading-8 text-base">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* Syntax */}
          {topic.syntaxCode && (
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Code2 size={16} className="text-violet-400" />
                <h2 className="text-base font-bold dark:text-white text-slate-900">الصياغة (Syntax)</h2>
              </div>
              <SchoolCodeBlock
                code={topic.syntaxCode}
                language={language}
                title="syntax"
                showTryIt={false}
              />
            </section>
          )}

          {/* Code examples */}
          {topic.codeExamples?.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Code2 size={16} className="text-emerald-400" />
                <h2 className="text-base font-bold dark:text-white text-slate-900">أمثلة عملية</h2>
              </div>
              <div className="space-y-6">
                {topic.codeExamples.map((ex, i) => (
                  <div key={i}>
                    {ex.title && (
                      <p className="text-sm font-semibold dark:text-slate-400 text-slate-500 mb-2">
                        مثال {i + 1}: {ex.title}
                      </p>
                    )}
                    <SchoolCodeBlock
                      code={ex.code}
                      language={ex.language || language}
                      title={ex.title}
                      showTryIt
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Pro tips */}
          {topic.proTipsAr && (
            <section className="mb-10">
              <div className="dark:bg-amber-500/5 bg-amber-50 dark:border-amber-500/20 border border-amber-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={16} className="text-amber-400 shrink-0" />
                  <h2 className="text-sm font-bold text-amber-600 dark:text-amber-400">نصائح احترافية</h2>
                </div>
                <ul className="space-y-2">
                  {topic.proTipsAr.split("\n").filter(Boolean).map((tip, i) => (
                    <li key={i} className="flex gap-2.5 text-sm dark:text-slate-300 text-slate-600 leading-relaxed">
                      <span className="text-amber-400 mt-0.5 shrink-0">—</span>
                      <span>{tip.replace(/^[-•–]\s*/, "")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Reference table */}
          {topic.referenceTableJson && topic.referenceTableJson.headers?.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Table2 size={16} className="text-indigo-400" />
                <h2 className="text-base font-bold dark:text-white text-slate-900">جدول مرجعي سريع</h2>
              </div>
              <div className="overflow-x-auto rounded-2xl border dark:border-white/10 border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="dark:bg-white/5 bg-slate-50 border-b dark:border-white/10 border-slate-200">
                      {topic.referenceTableJson.headers.map((h, i) => (
                        <th
                          key={i}
                          className="px-4 py-3 text-right font-semibold dark:text-slate-300 text-slate-700 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topic.referenceTableJson.rows.map((row, ri) => (
                      <tr
                        key={ri}
                        className="border-b dark:border-white/5 border-slate-100 dark:hover:bg-white/[0.02] hover:bg-slate-50 transition-colors last:border-0"
                      >
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className={`px-4 py-3 dark:text-slate-300 text-slate-600 leading-relaxed align-top ${
                              ci === 0 ? "font-mono text-xs dark:text-cyan-400 text-cyan-600 whitespace-nowrap" : ""
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Prev / Next navigation */}
          <div className="border-t dark:border-white/10 border-slate-200 pt-8 mt-10 flex items-center justify-between gap-4">
            {prev ? (
              <Link
                href={`/learn/${language}/${prev.slug}`}
                className="group flex items-center gap-3 px-5 py-3 rounded-xl dark:bg-white/[0.03] bg-white border dark:border-white/10 border-slate-200 hover:dark:border-white/20 hover:border-slate-300 transition-all text-sm"
              >
                <ArrowRight size={15} className="dark:text-slate-500 text-slate-400 group-hover:dark:text-cyan-400 group-hover:text-cyan-500 transition-colors shrink-0" />
                <div className="text-right min-w-0">
                  <p className="text-xs dark:text-slate-500 text-slate-400 mb-0.5">الدرس السابق</p>
                  <p className="font-semibold dark:text-white text-slate-900 truncate max-w-[160px]">{prev.titleAr}</p>
                </div>
              </Link>
            ) : <div />}

            {next ? (
              <Link
                href={`/learn/${language}/${next.slug}`}
                className="group flex items-center gap-3 px-5 py-3 rounded-xl dark:bg-white/[0.03] bg-white border dark:border-white/10 border-slate-200 hover:dark:border-white/20 hover:border-slate-300 transition-all text-sm"
              >
                <div className="text-left min-w-0">
                  <p className="text-xs dark:text-slate-500 text-slate-400 mb-0.5">الدرس التالي</p>
                  <p className="font-semibold dark:text-white text-slate-900 truncate max-w-[160px]">{next.titleAr}</p>
                </div>
                <ArrowLeft size={15} className="dark:text-slate-500 text-slate-400 group-hover:dark:text-cyan-400 group-hover:text-cyan-500 transition-colors shrink-0" />
              </Link>
            ) : <div />}
          </div>

        </div>
      </main>
    </div>
  );
}
