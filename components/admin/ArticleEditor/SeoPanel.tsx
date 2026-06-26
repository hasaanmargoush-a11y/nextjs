"use client";

import { useState, useMemo } from "react";
import {
  Search, Globe, Twitter, Share2, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle, Info, Zap, TrendingUp, AlertTriangle,
  RefreshCw, Check, BarChart3, Target, FileText, Image,
  Link2, Hash, Sparkles, Loader2, Copy, ChevronRight, X,
} from "lucide-react";
import { analyzeSeo, generateSlugFromTitle, type SeoForm, type SeoAnalysisResult } from "@/lib/seo-analyzer";
import ImageUploadField from "./ImageUploadField";

interface SeoPanelProps {
  form: SeoForm & { content: string };
  onChange: (field: string, value: string | boolean | string[]) => void;
}

// ── Score Gauge ─────────────────────────────────────────────────────────────

function ScoreGauge({ score, probability }: { score: number; probability: number }) {
  const scoreColor =
    score >= 85 ? "#22d3ee" : score >= 65 ? "#a78bfa" : score >= 40 ? "#f59e0b" : "#f87171";
  const probColor =
    probability >= 70 ? "#4ade80" : probability >= 45 ? "#f59e0b" : "#f87171";

  const verdict =
    score >= 85 ? "ممتاز" : score >= 65 ? "جيد" : score >= 40 ? "يحتاج تحسين" : "ضعيف";

  const circumference = 2 * Math.PI * 40;
  const scoreOffset = circumference - (score / 100) * circumference;
  const probOffset = circumference - (probability / 100) * circumference;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col items-center gap-2 p-3 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="40" fill="none" strokeWidth="7" className="stroke-slate-200 dark:stroke-white/10" />
          <circle
            cx="44" cy="44" r="40" fill="none" strokeWidth="7"
            stroke={scoreColor}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={scoreOffset}
            transform="rotate(-90 44 44)"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
          <text x="44" y="41" textAnchor="middle" fontSize="18" fontWeight="800" fill={scoreColor}>{score}</text>
          <text x="44" y="55" textAnchor="middle" fontSize="8" fill="#94a3b8">%</text>
        </svg>
        <div className="text-center">
          <p className="text-xs font-bold dark:text-white text-slate-900">نتيجة SEO</p>
          <p className="text-[11px]" style={{ color: scoreColor }}>{verdict}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 p-3 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="40" fill="none" strokeWidth="7" className="stroke-slate-200 dark:stroke-white/10" />
          <circle
            cx="44" cy="44" r="40" fill="none" strokeWidth="7"
            stroke={probColor}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={probOffset}
            transform="rotate(-90 44 44)"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
          <text x="44" y="41" textAnchor="middle" fontSize="18" fontWeight="800" fill={probColor}>{probability}</text>
          <text x="44" y="55" textAnchor="middle" fontSize="8" fill="#94a3b8">%</text>
        </svg>
        <div className="text-center">
          <p className="text-xs font-bold dark:text-white text-slate-900">فرصة التصدر</p>
          <p className="text-[11px]" style={{ color: probColor }}>
            {probability >= 70 ? "مرتفعة" : probability >= 45 ? "متوسطة" : "منخفضة"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Content Metrics ─────────────────────────────────────────────────────────

function ContentMetrics({ analysis }: { analysis: SeoAnalysisResult["content"] }) {
  const wc = analysis.wordCount;
  const wcLevel = wc >= 1000 ? "ممتاز" : wc >= 600 ? "جيد" : wc >= 300 ? "مقبول" : "قصير";
  const wcColor = wc >= 1000 ? "text-green-400" : wc >= 600 ? "text-cyan-400" : wc >= 300 ? "text-amber-400" : "text-red-400";

  const items = [
    { icon: <FileText className="w-3 h-3" />, label: "الكلمات", value: wc.toLocaleString("ar"), note: wcLevel, color: wcColor },
    { icon: <BarChart3 className="w-3 h-3" />, label: "القراءة", value: `${analysis.readTimeMinutes} دق`, note: analysis.readTimeMinutes >= 5 ? "عمق جيد" : "قصير", color: analysis.readTimeMinutes >= 5 ? "text-green-400" : "text-amber-400" },
    { icon: <Image className="w-3 h-3" />, label: "الصور", value: String(analysis.imageCount), note: analysis.imageCount >= 2 ? "ممتاز" : analysis.imageCount === 1 ? "مقبول" : "لا يوجد", color: analysis.imageCount >= 2 ? "text-green-400" : analysis.imageCount === 1 ? "text-amber-400" : "text-red-400" },
    { icon: <Hash className="w-3 h-3" />, label: "H2", value: String(analysis.h2Count), note: analysis.h2Count >= 2 ? "ممتاز" : analysis.h2Count === 1 ? "مقبول" : "لا يوجد", color: analysis.h2Count >= 2 ? "text-green-400" : analysis.h2Count === 1 ? "text-amber-400" : "text-red-400" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border dark:border-white/10 border-slate-200 p-2 dark:bg-white/5 bg-slate-50 text-center">
          <div className="flex items-center justify-center gap-1 dark:text-slate-500 text-slate-400 mb-1">{item.icon}</div>
          <div className={`text-sm font-bold ${item.color}`}>{item.value}</div>
          <div className="text-[10px] dark:text-slate-500 text-slate-400">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Suggestions ─────────────────────────────────────────────────────────────

function Suggestions({ result }: { result: SeoAnalysisResult }) {
  if (result.suggestions.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl dark:bg-green-500/10 bg-green-50 border dark:border-green-500/20 border-green-200">
        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
        <p className="text-xs text-green-600 dark:text-green-400 font-medium">ممتاز! المقال محسّن بشكل جيد جداً لمحركات البحث.</p>
      </div>
    );
  }

  const high = result.suggestions.filter(s => s.priority === "high");
  const medium = result.suggestions.filter(s => s.priority === "medium");
  const low = result.suggestions.filter(s => s.priority === "low");

  return (
    <div className="space-y-1.5">
      {high.map((s, i) => (
        <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg dark:bg-red-500/10 bg-red-50 border dark:border-red-500/20 border-red-100">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">{s.title}</p>
            {s.description !== s.title && <p className="text-[11px] text-red-500/80 dark:text-red-400/60 mt-0.5">{s.description}</p>}
          </div>
        </div>
      ))}
      {medium.map((s, i) => (
        <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg dark:bg-amber-500/10 bg-amber-50 border dark:border-amber-500/20 border-amber-100">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">{s.title}</p>
            {s.description !== s.title && <p className="text-[11px] text-amber-500/80 dark:text-amber-400/60 mt-0.5">{s.description}</p>}
          </div>
        </div>
      ))}
      {low.map((s, i) => (
        <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg dark:bg-blue-500/10 bg-blue-50 border dark:border-blue-500/20 border-blue-100">
          <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{s.title}</p>
            {s.description !== s.title && <p className="text-[11px] text-blue-500/80 dark:text-blue-400/60 mt-0.5">{s.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Check List ──────────────────────────────────────────────────────────────

function CheckList({ result }: { result: SeoAnalysisResult }) {
  const [showAll, setShowAll] = useState(false);

  const criticalChecks = result.checks.filter(c => c.category === "critical");
  const importantChecks = result.checks.filter(c => c.category === "important");
  const optionalChecks = result.checks.filter(c => c.category === "optional");

  const renderCheck = (c: SeoAnalysisResult["checks"][0]) => (
    <div key={c.id} className="space-y-0.5">
      <div className="flex items-start gap-1.5">
        {c.status === "pass" ? (
          <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
        ) : c.status === "warn" ? (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
        )}
        <span className={`text-xs leading-tight ${c.status === "pass" ? "dark:text-slate-300 text-slate-700" : c.status === "warn" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
          {c.label}
        </span>
      </div>
      {c.detail && c.status !== "pass" && (
        <p className="text-[10px] dark:text-slate-500 text-slate-400 mr-5 leading-snug">{c.detail}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1.5">ضروري</p>
        <div className="space-y-2">{criticalChecks.map(renderCheck)}</div>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1.5">مهم</p>
        <div className="space-y-2">{importantChecks.map(renderCheck)}</div>
      </div>
      {showAll && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1.5">إضافي</p>
          <div className="space-y-2">{optionalChecks.map(renderCheck)}</div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setShowAll(v => !v)}
        className="text-[11px] dark:text-slate-500 text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
      >
        {showAll ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {showAll ? "إخفاء الفحوصات الإضافية" : `عرض ${optionalChecks.length} فحص إضافي`}
      </button>
    </div>
  );
}

// ── SERP Preview ────────────────────────────────────────────────────────────

function SerpPreview({ form }: { form: SeoPanelProps["form"] }) {
  const title = form.metaTitle || form.title || "عنوان المقال";
  const desc = form.metaDescription || form.excerpt || "وصف المقال سيظهر هنا...";
  const slug = form.slug || "article-slug";

  const tLen = title.length;
  const dLen = desc.length;
  const tOk = tLen >= 30 && tLen <= 60;
  const dOk = dLen >= 120 && dLen <= 160;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border dark:border-white/10 border-slate-200 overflow-hidden bg-white shadow-sm">
        <div className="bg-[#f8f9fa] px-3 py-2 border-b border-slate-200 flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="p-4 bg-white" dir="ltr">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-white text-[8px] font-bold">N</div>
            <div>
              <p className="text-xs text-slate-700 font-medium leading-none">Nouvil</p>
              <p className="text-[10px] text-slate-400">nouvil.com › articles › {slug}</p>
            </div>
          </div>
          <h3 className={`text-[#1a0dab] text-base font-normal leading-snug hover:underline cursor-pointer mb-1 ${tLen > 60 ? "line-clamp-1" : ""}`}>{title}</h3>
          <p className="text-[#4d5156] text-xs leading-snug line-clamp-2">{desc}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className={`flex items-center gap-1.5 p-2 rounded-lg border ${tOk ? "dark:border-green-500/20 border-green-100 dark:bg-green-500/5 bg-green-50" : "dark:border-amber-500/20 border-amber-100 dark:bg-amber-500/5 bg-amber-50"}`}>
          {tOk ? <CheckCircle className="w-3 h-3 text-green-500" /> : <AlertCircle className="w-3 h-3 text-amber-500" />}
          <div>
            <p className={`font-medium text-[11px] ${tOk ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>العنوان</p>
            <p className="text-[10px] dark:text-slate-400 text-slate-500">{tLen}/60</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 p-2 rounded-lg border ${dOk ? "dark:border-green-500/20 border-green-100 dark:bg-green-500/5 bg-green-50" : "dark:border-amber-500/20 border-amber-100 dark:bg-amber-500/5 bg-amber-50"}`}>
          {dOk ? <CheckCircle className="w-3 h-3 text-green-500" /> : <AlertCircle className="w-3 h-3 text-amber-500" />}
          <div>
            <p className={`font-medium text-[11px] ${dOk ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>الوصف</p>
            <p className="text-[10px] dark:text-slate-400 text-slate-500">{dLen}/160</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Collapsible ─────────────────────────────────────────────────────────────

function CollapsibleSection({
  title, icon, children, defaultOpen = false, badge,
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border dark:border-white/10 border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 dark:bg-[#111827] bg-slate-50 dark:hover:bg-white/5 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold dark:text-white text-slate-900">
          {icon}{title}{badge}
        </div>
        {open ? <ChevronUp className="w-4 h-4 dark:text-slate-400 text-slate-500" /> : <ChevronDown className="w-4 h-4 dark:text-slate-400 text-slate-500" />}
      </button>
      {open && <div className="p-3 space-y-3 dark:bg-[#0d1424] bg-white">{children}</div>}
    </div>
  );
}

const inputClass = "w-full px-3 py-2 rounded-lg dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 outline-none focus:border-cyan-500 text-sm transition-colors";
const labelClass = "block text-xs font-medium dark:text-slate-400 text-slate-500 mb-1";

function CharCounter({ value, max, warn }: { value: string; max: number; warn: number }) {
  const len = value.length;
  const color = len > max ? "text-red-400" : len >= warn ? "text-amber-400" : len > 0 ? "text-green-400" : "dark:text-slate-500 text-slate-400";
  return <span className={`text-xs ${color}`}>{len}/{max}</span>;
}

function AutoFillButton({ onClick, label = "ملء تلقائي" }: { onClick: () => void; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { onClick(); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] dark:bg-cyan-500/10 bg-cyan-50 dark:text-cyan-400 text-cyan-600 border dark:border-cyan-500/20 border-cyan-200 hover:dark:bg-cyan-500/20 hover:bg-cyan-100 transition-colors"
    >
      {done ? <Check className="w-2.5 h-2.5" /> : <RefreshCw className="w-2.5 h-2.5" />}
      {done ? "تم!" : label}
    </button>
  );
}

// ── AI Suggestions Panel ────────────────────────────────────────────────────

interface AiSuggestion {
  titleSuggestions: Array<{ text: string; score: number; reason: string }>;
  descriptionSuggestions: Array<{ text: string; score: number; reason: string }>;
  keywordSuggestions: string[];
  titleAnalysis: string;
  generalTips: string[];
}

function AiSeoPanel({ form, onChange }: SeoPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);

  const canAnalyze = !!(form.title || form.excerpt);

  const analyze = async () => {
    if (!canAnalyze) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/articles/ai-seo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("nouvil_token") || ""}`,
        },
        body: JSON.stringify({
          title: form.title,
          excerpt: form.excerpt,
          content: form.content,
          focusKeyword: form.focusKeyword,
          category: form.category,
          currentMetaTitle: form.metaTitle,
          currentMetaDescription: form.metaDescription,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || "فشل التحليل");
      }
      const data = await res.json() as AiSuggestion;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const applyTitle = (text: string) => {
    onChange("metaTitle", text.slice(0, 60));
  };

  const applyDesc = (text: string) => {
    onChange("metaDescription", text.slice(0, 160));
  };

  const applyKeyword = (kw: string) => {
    onChange("focusKeyword", kw);
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedIdx(key);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const scoreColor = (s: number) =>
    s >= 85 ? "text-green-400" : s >= 70 ? "text-cyan-400" : s >= 55 ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-3 rounded-xl dark:bg-violet-500/10 bg-violet-50 border dark:border-violet-500/20 border-violet-200">
        <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold dark:text-violet-300 text-violet-700">تحليل SEO بالذكاء الاصطناعي</p>
          <p className="text-[11px] dark:text-violet-400/70 text-violet-600/70 mt-0.5">
            يقترح عناوين وأوصاف محسّنة بناءً على محتوى مقالك وكلمتك المفتاحية
          </p>
        </div>
      </div>

      {!result && !loading && (
        <button
          type="button"
          onClick={analyze}
          disabled={!canAnalyze}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-4 h-4" />
          تحليل وإنشاء اقتراحات
        </button>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-2 py-6">
          <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
          <p className="text-xs dark:text-slate-400 text-slate-500">جاري التحليل بالذكاء الاصطناعي...</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg dark:bg-red-500/10 bg-red-50 border dark:border-red-500/20 border-red-100">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-400 flex-1">{error}</p>
          <button type="button" onClick={() => setError(null)}><X className="w-3.5 h-3.5 text-red-400" /></button>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold dark:text-white text-slate-900 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
              تم التحليل بنجاح
            </p>
            <button
              type="button"
              onClick={() => { setResult(null); analyze(); }}
              className="text-[11px] flex items-center gap-1 dark:text-slate-400 text-slate-500 hover:text-violet-400 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              إعادة التحليل
            </button>
          </div>

          {result.titleAnalysis && (
            <div className="p-2.5 rounded-lg dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200">
              <p className="text-[11px] dark:text-slate-300 text-slate-700 leading-relaxed">
                <span className="font-bold text-violet-400">تحليل العنوان: </span>
                {result.titleAnalysis}
              </p>
            </div>
          )}

          {result.titleSuggestions?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold dark:text-slate-300 text-slate-700">اقتراحات عنوان SEO</p>
              {result.titleSuggestions.map((s, i) => (
                <div key={i} className="rounded-lg border dark:border-white/10 border-slate-200 dark:bg-white/5 bg-slate-50 p-2.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs dark:text-white text-slate-900 leading-snug flex-1">{s.text}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={`text-[10px] font-bold ${scoreColor(s.score)}`}>{s.score}%</span>
                      <button
                        type="button"
                        onClick={() => copyText(s.text, `title-${i}`)}
                        className="p-1 rounded dark:hover:bg-white/10 hover:bg-slate-200 transition-colors"
                        title="نسخ"
                      >
                        {copiedIdx === `title-${i}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 dark:text-slate-400 text-slate-500" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] dark:text-slate-500 text-slate-400">{s.reason} · {s.text.length} حرف</p>
                    <button
                      type="button"
                      onClick={() => applyTitle(s.text)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors font-medium"
                    >
                      <ChevronRight className="w-2.5 h-2.5" />
                      تطبيق
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.descriptionSuggestions?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold dark:text-slate-300 text-slate-700">اقتراحات وصف SEO</p>
              {result.descriptionSuggestions.map((s, i) => (
                <div key={i} className="rounded-lg border dark:border-white/10 border-slate-200 dark:bg-white/5 bg-slate-50 p-2.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs dark:text-white text-slate-900 leading-snug flex-1">{s.text}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={`text-[10px] font-bold ${scoreColor(s.score)}`}>{s.score}%</span>
                      <button
                        type="button"
                        onClick={() => copyText(s.text, `desc-${i}`)}
                        className="p-1 rounded dark:hover:bg-white/10 hover:bg-slate-200 transition-colors"
                        title="نسخ"
                      >
                        {copiedIdx === `desc-${i}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 dark:text-slate-400 text-slate-500" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] dark:text-slate-500 text-slate-400">{s.reason} · {s.text.length} حرف</p>
                    <button
                      type="button"
                      onClick={() => applyDesc(s.text)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors font-medium"
                    >
                      <ChevronRight className="w-2.5 h-2.5" />
                      تطبيق
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.keywordSuggestions?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold dark:text-slate-300 text-slate-700">كلمات مفتاحية مقترحة</p>
              <div className="flex flex-wrap gap-1.5">
                {result.keywordSuggestions.map((kw, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyKeyword(kw)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      form.focusKeyword === kw
                        ? "bg-cyan-500 text-white border-cyan-500"
                        : "dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-700 dark:border-white/10 border-slate-200 hover:border-cyan-400 hover:text-cyan-400"
                    }`}
                  >
                    {form.focusKeyword === kw ? <Check className="w-3 h-3 inline ml-1" /> : null}
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          )}

          {result.generalTips?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold dark:text-slate-300 text-slate-700">نصائح إضافية</p>
              {result.generalTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                  <p className="text-[11px] dark:text-slate-400 text-slate-600 leading-snug">{tip}</p>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setResult(null)}
            className="w-full py-2 rounded-lg dark:bg-white/5 bg-slate-100 text-xs dark:text-slate-400 text-slate-500 hover:text-cyan-400 transition-colors"
          >
            إغلاق النتائج
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function SeoPanel({ form, onChange }: SeoPanelProps) {
  const result = useMemo(() => analyzeSeo(form), [form]);

  const statusBadge = (count: number, color: string, label: string) =>
    count > 0 ? (
      <span className={`mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${color}`}>{count} {label}</span>
    ) : null;

  const criticalBadge = statusBadge(result.criticalFails, "bg-red-500/20 text-red-400", "مشكلة");
  const warnBadge = statusBadge(result.warnCount, "bg-amber-500/20 text-amber-400", "تحذير");

  return (
    <div className="space-y-4" dir="rtl">
      {/* Score overview */}
      <CollapsibleSection
        title="نتيجة SEO"
        icon={<Target className="w-4 h-4 text-cyan-400" />}
        defaultOpen
        badge={criticalBadge}
      >
        <ScoreGauge score={result.score} probability={result.successProbability} />
        <ContentMetrics analysis={result.content} />
      </CollapsibleSection>

      {/* AI SEO Suggestions */}
      <CollapsibleSection
        title="اقتراحات الذكاء الاصطناعي"
        icon={<Sparkles className="w-4 h-4 text-violet-400" />}
        defaultOpen
      >
        <AiSeoPanel form={form} onChange={onChange} />
      </CollapsibleSection>

      {/* Suggestions */}
      <CollapsibleSection
        title="توصيات التحسين"
        icon={<Zap className="w-4 h-4 text-yellow-400" />}
        defaultOpen
        badge={result.criticalFails > 0 ? criticalBadge : warnBadge}
      >
        <Suggestions result={result} />
      </CollapsibleSection>

      {/* Full checklist */}
      <CollapsibleSection
        title="قائمة الفحص الكاملة"
        icon={<TrendingUp className="w-4 h-4 text-violet-400" />}
      >
        <div className="flex items-center gap-3 text-[11px] mb-2">
          <span className="flex items-center gap-1 text-green-400"><CheckCircle className="w-3 h-3" /> {result.passCount} ناجح</span>
          <span className="flex items-center gap-1 text-amber-400"><AlertTriangle className="w-3 h-3" /> {result.warnCount} تحذير</span>
          <span className="flex items-center gap-1 text-red-400"><AlertCircle className="w-3 h-3" /> {result.failCount} فشل</span>
        </div>
        <CheckList result={result} />
      </CollapsibleSection>

      {/* SEO Basic fields */}
      <CollapsibleSection title="SEO الأساسي" icon={<Search className="w-4 h-4 text-violet-400" />} defaultOpen>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>الكلمة المفتاحية الرئيسية (Focus Keyword)</label>
          </div>
          <input
            value={form.focusKeyword}
            onChange={(e) => onChange("focusKeyword", e.target.value)}
            className={inputClass}
            placeholder="مثال: تعلم Python"
          />
          {form.focusKeyword && (
            <p className="text-[11px] dark:text-slate-500 text-slate-400 mt-1 flex items-center gap-1">
              <span>كثافة في المحتوى:</span>
              <span className={result.content.wordCount > 0 ? "text-cyan-400" : "dark:text-slate-500 text-slate-400"}>
                {result.content.wordCount > 0
                  ? `${((result.content.plainText.toLowerCase().split(form.focusKeyword.toLowerCase()).length - 1) / Math.max(1, result.content.wordCount) * 100).toFixed(1)}%`
                  : "—"}
              </span>
              <span>· ظهر</span>
              <span className="text-cyan-400">
                {result.content.plainText ? Math.max(0, result.content.plainText.toLowerCase().split(form.focusKeyword.toLowerCase()).length - 1) : 0}
              </span>
              <span>مرة</span>
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>عنوان SEO (Meta Title)</label>
            <div className="flex items-center gap-2">
              {!form.metaTitle && form.title && (
                <AutoFillButton onClick={() => onChange("metaTitle", form.title.slice(0, 60))} label="من العنوان" />
              )}
              <CharCounter value={form.metaTitle} max={60} warn={50} />
            </div>
          </div>
          <input
            value={form.metaTitle}
            onChange={(e) => onChange("metaTitle", e.target.value)}
            className={inputClass}
            placeholder="عنوان محرك البحث (30-60 حرف)"
          />
          {form.focusKeyword && form.metaTitle && !form.metaTitle.toLowerCase().includes(form.focusKeyword.toLowerCase()) && (
            <p className="text-[11px] text-amber-500 mt-1">أضف &quot;{form.focusKeyword}&quot; في العنوان</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>وصف SEO (Meta Description)</label>
            <div className="flex items-center gap-2">
              {!form.metaDescription && form.excerpt && (
                <AutoFillButton onClick={() => onChange("metaDescription", form.excerpt.slice(0, 160))} label="من المقتطف" />
              )}
              <CharCounter value={form.metaDescription} max={160} warn={120} />
            </div>
          </div>
          <textarea
            value={form.metaDescription}
            onChange={(e) => onChange("metaDescription", e.target.value)}
            rows={3}
            className={`${inputClass} resize-none`}
            placeholder="وصف يظهر في نتائج البحث (120-160 حرف)"
          />
          {form.focusKeyword && form.metaDescription && !form.metaDescription.toLowerCase().includes(form.focusKeyword.toLowerCase()) && (
            <p className="text-[11px] text-amber-500 mt-1">أضف &quot;{form.focusKeyword}&quot; في الوصف بشكل طبيعي</p>
          )}
        </div>

        <div>
          <label className={labelClass}>الكلمات المفتاحية الإضافية (مفصولة بفاصلة)</label>
          <input
            value={form.metaKeywords}
            onChange={(e) => onChange("metaKeywords", e.target.value)}
            className={inputClass}
            placeholder="Python, البرمجة, تعلم البرمجة"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>Canonical URL</label>
            {!form.canonicalUrl && form.slug && (
              <AutoFillButton
                onClick={() => onChange("canonicalUrl", `https://nouvil.com/articles/${form.slug}`)}
                label="ملء تلقائي"
              />
            )}
          </div>
          <input
            value={form.canonicalUrl}
            onChange={(e) => onChange("canonicalUrl", e.target.value)}
            className={inputClass}
            placeholder="https://nouvil.com/articles/slug"
            dir="ltr"
          />
        </div>

        <div className="flex gap-4 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.noIndex} onChange={(e) => onChange("noIndex", e.target.checked)} className="w-3.5 h-3.5 accent-cyan-400" />
            <span className="text-xs dark:text-slate-300 text-slate-700">No Index</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.noFollow} onChange={(e) => onChange("noFollow", e.target.checked)} className="w-3.5 h-3.5 accent-cyan-400" />
            <span className="text-xs dark:text-slate-300 text-slate-700">No Follow</span>
          </label>
        </div>

        {form.noIndex && (
          <div className="flex items-center gap-2 p-2 rounded-lg dark:bg-amber-500/10 bg-amber-50 border dark:border-amber-500/20 border-amber-200 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            هذا المقال لن يظهر في Google بسبب تفعيل noIndex
          </div>
        )}
      </CollapsibleSection>

      {/* SERP Preview */}
      <CollapsibleSection title="معاينة Google" icon={<Globe className="w-4 h-4 text-blue-400" />} defaultOpen>
        <SerpPreview form={form} />
      </CollapsibleSection>

      {/* Heading structure */}
      {result.content.headings.length > 0 && (
        <CollapsibleSection title={`هيكل العناوين (${result.content.headings.length})`} icon={<Hash className="w-4 h-4 text-teal-400" />}>
          <div className="space-y-1">
            {result.content.headings.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${h.level === 1 ? "bg-violet-500/20 text-violet-400" : h.level === 2 ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-500/20 text-slate-400"}`}>
                  H{h.level}
                </span>
                <span className="text-xs dark:text-slate-300 text-slate-700 truncate">{h.text}</span>
                {form.focusKeyword && h.level === 2 && h.text.toLowerCase().includes(form.focusKeyword.toLowerCase()) && (
                  <span className="text-[10px] text-green-400 ml-auto shrink-0">keyword</span>
                )}
              </div>
            ))}
          </div>
          {result.content.h1Count > 1 && (
            <p className="text-[11px] text-amber-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              يوجد {result.content.h1Count} عناوين H1 — يُنصح بعنوان H1 واحد فقط
            </p>
          )}
        </CollapsibleSection>
      )}

      {/* Open Graph */}
      <CollapsibleSection
        title="Open Graph (مشاركة)"
        icon={<Share2 className="w-4 h-4 text-orange-400" />}
        badge={(!form.ogTitle || !form.ogDescription) ? <span className="mr-1 text-[10px] text-amber-400 font-medium">غير مكتمل</span> : null}
      >
        <div className="flex items-start gap-1 p-2 rounded-lg dark:bg-blue-500/10 bg-blue-50 border dark:border-blue-500/20 border-blue-100 text-xs dark:text-blue-300 text-blue-600">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>تظهر عند مشاركة المقال على Facebook وLinkedIn وغيرها</span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>عنوان OG</label>
            {!form.ogTitle && (
              <AutoFillButton onClick={() => onChange("ogTitle", form.metaTitle || form.title)} label="من عنوان SEO" />
            )}
          </div>
          <input value={form.ogTitle} onChange={(e) => onChange("ogTitle", e.target.value)} className={inputClass} placeholder="عنوان المشاركة (افتراضي: عنوان المقال)" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>وصف OG</label>
            {!form.ogDescription && (
              <AutoFillButton onClick={() => onChange("ogDescription", form.metaDescription || form.excerpt)} label="من وصف SEO" />
            )}
          </div>
          <textarea value={form.ogDescription} onChange={(e) => onChange("ogDescription", e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="وصف المشاركة" />
        </div>

        <ImageUploadField
          value={form.ogImage}
          onChange={(url) => onChange("ogImage", url)}
          label="صورة OG"
          hint={!form.ogImage && form.thumbnail ? "ستُستخدم الصورة الرئيسية تلقائياً عند المشاركة" : undefined}
          previewHeight="h-28"
        />

        {!form.ogImage && form.thumbnail && (
          <div className="flex items-center justify-between p-2 rounded-lg dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200">
            <div className="flex items-center gap-2">
              <img src={form.thumbnail} alt="" className="w-10 h-7 object-cover rounded" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
              <p className="text-[11px] dark:text-slate-400 text-slate-500">سيُستخدم: الصورة الرئيسية</p>
            </div>
            <button
              type="button"
              onClick={() => onChange("ogImage", form.thumbnail)}
              className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors"
            >
              تثبيت
            </button>
          </div>
        )}

        {(form.ogTitle || form.ogImage || form.thumbnail) && (
          <div className="rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden shadow-sm" dir="ltr">
            {(form.ogImage || form.thumbnail) ? (
              <img src={form.ogImage || form.thumbnail} alt="OG" className="w-full h-28 object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div className="w-full h-28 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center"><Share2 className="w-7 h-7 dark:text-slate-600 text-slate-300" /></div>
            )}
            <div className="p-2.5 dark:bg-[#1c1e21] bg-[#f0f2f5]">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">NOUVIL.COM</p>
              <p className="text-xs font-semibold dark:text-white text-slate-900 leading-tight line-clamp-2">{form.ogTitle || form.metaTitle || form.title || "عنوان المقال"}</p>
              <p className="text-[11px] dark:text-slate-400 text-slate-500 mt-0.5 line-clamp-2">{form.ogDescription || form.metaDescription || form.excerpt || "الوصف..."}</p>
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Twitter Card */}
      <CollapsibleSection
        title="Twitter / X Card"
        icon={<Twitter className="w-4 h-4 text-sky-400" />}
        badge={(!form.twitterTitle || !form.twitterDescription) ? <span className="mr-1 text-[10px] text-slate-400 font-medium">اختياري</span> : null}
      >
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>عنوان Twitter</label>
            {!form.twitterTitle && (
              <AutoFillButton onClick={() => onChange("twitterTitle", form.ogTitle || form.metaTitle || form.title)} label="من OG" />
            )}
          </div>
          <input value={form.twitterTitle} onChange={(e) => onChange("twitterTitle", e.target.value)} className={inputClass} placeholder="عنوان بطاقة Twitter (70 حرف)" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>وصف Twitter</label>
            {!form.twitterDescription && (
              <AutoFillButton onClick={() => onChange("twitterDescription", form.ogDescription || form.metaDescription || form.excerpt)} label="من OG" />
            )}
          </div>
          <textarea value={form.twitterDescription} onChange={(e) => onChange("twitterDescription", e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="وصف بطاقة Twitter (200 حرف)" />
        </div>

        <ImageUploadField
          value={form.twitterImage}
          onChange={(url) => onChange("twitterImage", url)}
          label="صورة Twitter"
          hint={!form.twitterImage && (form.ogImage || form.thumbnail) ? "ستُستخدم صورة OG أو الصورة الرئيسية تلقائياً" : undefined}
          previewHeight="h-28"
        />

        {!form.twitterImage && (form.ogImage || form.thumbnail) && (
          <div className="flex items-center justify-between p-2 rounded-lg dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200">
            <div className="flex items-center gap-2">
              <img src={form.ogImage || form.thumbnail} alt="" className="w-10 h-7 object-cover rounded" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
              <p className="text-[11px] dark:text-slate-400 text-slate-500">سيُستخدم: {form.ogImage ? "صورة OG" : "الصورة الرئيسية"}</p>
            </div>
            <button
              type="button"
              onClick={() => onChange("twitterImage", form.ogImage || form.thumbnail)}
              className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 transition-colors"
            >
              تثبيت
            </button>
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
