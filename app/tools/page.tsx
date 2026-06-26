"use client";

import { useState } from "react";
import { useRouteOverride } from "@/hooks/useRouteOverride";
import { BlockRenderer } from "@/components/page-builder/BlockRenderer";
import { motion } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Code2,
  Braces,
  Terminal,
  Regex,
  Palette,
  FileCode,
  Cpu,
  Hash,
  Clock,
  Link as LinkIcon,
  Type,
  Database,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface Tool {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  color: string;
  href: string;
  isNew?: boolean;
  isAI?: boolean;
}

const TOOLS: Tool[] = [
  {
    id: "code-executor",
    title: "محرر وتنفيذ الكود",
    description: "اكتب وشغّل كودك مباشرة في المتصفح بدون أي إعداد. يدعم Python، JavaScript، C++، Java والمزيد",
    icon: <Terminal className="w-6 h-6" />,
    category: "تطوير",
    color: "cyan",
    href: "/tools/code-executor",
    isNew: true,
  },
  {
    id: "ai-solver",
    title: "حل المسائل بالذكاء الاصطناعي",
    description: "أرسل مسألة برمجية وسيقوم الذكاء الاصطناعي بتحليلها وشرح الحل خطوة بخطوة",
    icon: <Cpu className="w-6 h-6" />,
    category: "ذكاء اصطناعي",
    color: "violet",
    href: "/tools/ai-solver",
    isAI: true,
  },
  {
    id: "json-formatter",
    title: "منسق JSON",
    description: "نسّق وتحقق من صحة JSON بشكل فوري. يدعم التحويل بين JSON وYAML",
    icon: <Braces className="w-6 h-6" />,
    category: "تنسيق",
    color: "amber",
    href: "/tools/json-formatter",
  },
  {
    id: "regex-tester",
    title: "اختبار Regular Expressions",
    description: "اختبر وتعلم كتابة التعبيرات النظامية مع شرح فوري وأمثلة تطبيقية",
    icon: <Regex className="w-6 h-6" />,
    category: "تطوير",
    color: "rose",
    href: "/tools/regex-tester",
  },
  {
    id: "color-picker",
    title: "منتقي الألوان",
    description: "أداة احترافية لاختيار الألوان وتحويلها بين HEX وRGB وHSL مع توليد palettes جاهزة",
    icon: <Palette className="w-6 h-6" />,
    category: "تصميم",
    color: "pink",
    href: "/tools/color-picker",
  },
  {
    id: "code-minifier",
    title: "ضغط الكود",
    description: "قلل حجم ملفات JavaScript وCSS وHTML لتسريع تحميل موقعك",
    icon: <FileCode className="w-6 h-6" />,
    category: "تحسين",
    color: "green",
    href: "/tools/code-minifier",
  },
  {
    id: "hash-generator",
    title: "مولد Hash",
    description: "حوّل النصوص إلى MD5 أو SHA-256 أو SHA-512. مفيد للأمن والتحقق من البيانات",
    icon: <Hash className="w-6 h-6" />,
    category: "أمن",
    color: "orange",
    href: "/tools/hash-generator",
  },
  {
    id: "unix-converter",
    title: "محول Unix Timestamp",
    description: "حوّل بين Unix Timestamp والتاريخ العادي. يدعم التواريخ العربية والميلادية",
    icon: <Clock className="w-6 h-6" />,
    category: "تحويل",
    color: "blue",
    href: "/tools/unix-converter",
  },
  {
    id: "url-encoder",
    title: "ترميز وفك ترميز URL",
    description: "رمّز وفك ترميز عناوين URL بضغطة زر. مفيد للتعامل مع APIs",
    icon: <LinkIcon className="w-6 h-6" />,
    category: "تحويل",
    color: "teal",
    href: "/tools/url-encoder",
  },
  {
    id: "text-tools",
    title: "أدوات النصوص",
    description: "عدّل النصوص: تحويل الحالة، عدّ الكلمات، إزالة التكرار، ترتيب الأسطر وأكثر",
    icon: <Type className="w-6 h-6" />,
    category: "نصوص",
    color: "purple",
    href: "/tools/text-tools",
  },
  {
    id: "sql-formatter",
    title: "منسق SQL",
    description: "نسّق استعلامات SQL لتصبح أكثر قراءة. يدعم PostgreSQL وMySQL وSQL Server",
    icon: <Database className="w-6 h-6" />,
    category: "قواعد بيانات",
    color: "indigo",
    href: "/tools/sql-formatter",
  },
  {
    id: "ai-code-review",
    title: "مراجعة الكود بالذكاء الاصطناعي",
    description: "أرسل كودك وسيقوم الذكاء الاصطناعي بمراجعته واقتراح تحسينات في الأداء والأمن",
    icon: <Code2 className="w-6 h-6" />,
    category: "ذكاء اصطناعي",
    color: "violet",
    href: "/tools/ai-code-review",
    isAI: true,
    isNew: true,
  },
];

const CATEGORIES = ["الكل", "تطوير", "ذكاء اصطناعي", "تنسيق", "تصميم", "تحويل", "أمن", "نصوص", "قواعد بيانات"];

const colorMap: Record<string, string> = {
  cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
  violet: "from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-400",
  amber: "from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400",
  rose: "from-rose-500/20 to-rose-500/5 border-rose-500/20 text-rose-400",
  pink: "from-pink-500/20 to-pink-500/5 border-pink-500/20 text-pink-400",
  green: "from-green-500/20 to-green-500/5 border-green-500/20 text-green-400",
  orange: "from-orange-500/20 to-orange-500/5 border-orange-500/20 text-orange-400",
  blue: "from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400",
  teal: "from-teal-500/20 to-teal-500/5 border-teal-500/20 text-teal-400",
  purple: "from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400",
  indigo: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/20 text-indigo-400",
};

function ToolsPageDefault() {
  const [category, setCategory] = useState("الكل");

  const filteredTools = category === "الكل"
    ? TOOLS
    : TOOLS.filter((t) => t.category === category);

  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="badge badge-cyan mb-4 inline-block">الأدوات</span>
              <h1 className="section-title dark:text-white text-slate-900 mb-4">
                أدوات المطور العربي
              </h1>
              <p className="dark:text-slate-400 text-slate-600">
                مجموعة من الأدوات المجانية لتسريع عملك كمطور. لا تسجيل، لا رسوم
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  category === cat
                    ? "gradient-bg text-white shadow-lg shadow-cyan-500/25"
                    : "dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-600 hover:text-cyan-400"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTools.map((tool, i) => {
              const colors = colorMap[tool.color] || colorMap.cyan;
              return (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  <Link href={tool.href}>
                    <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 p-6 hover:shadow-xl hover:shadow-cyan-500/5 transition-all group h-full flex flex-col">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors} border flex items-center justify-center`}>
                          {tool.icon}
                        </div>
                        <div className="flex gap-1">
                          {tool.isNew && (
                            <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/20 font-medium">
                              جديد
                            </span>
                          )}
                          {tool.isAI && (
                            <span className="px-2 py-0.5 text-xs bg-violet-500/20 text-violet-400 rounded-full border border-violet-500/20 font-medium">
                              AI
                            </span>
                          )}
                        </div>
                      </div>
                      <h3 className="font-bold dark:text-white text-slate-900 mb-2 group-hover:text-cyan-400 transition-colors">
                        {tool.title}
                      </h3>
                      <p className="dark:text-slate-400 text-slate-600 text-sm leading-relaxed flex-1">
                        {tool.description}
                      </p>
                      <div className="flex items-center gap-2 mt-4 text-sm font-medium dark:text-slate-400 text-slate-500 group-hover:text-cyan-400 transition-colors">
                        <span>فتح الأداة</span>
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default function ToolsPage() {
  const { checking, blocks } = useRouteOverride("tools");
  if (checking) return <MainLayout><div className="min-h-[80vh] dark:bg-[#0a0f1e] bg-slate-50" /></MainLayout>;
  if (blocks) return <MainLayout><BlockRenderer blocks={blocks} /></MainLayout>;
  return <ToolsPageDefault />;
}
