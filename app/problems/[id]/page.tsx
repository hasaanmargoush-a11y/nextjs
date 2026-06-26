"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import Link from "next/link";
import {
  Code2, CheckCircle, XCircle, ArrowRight, ArrowLeft, Loader2, Star,
  ChevronDown, ChevronUp, Lightbulb, Clock, Send, Trophy,
  Terminal, BookOpen, RefreshCw, Lock, Flame, ThumbsUp,
  Share2, BarChart2, Tag, Building2, Calendar, Users, Zap, X, ChevronRight, Trash2
} from "lucide-react";

interface Example { input: string; output: string; explanation?: string; }
interface TestCaseResult { input: string; expected: string; got: string; passed: boolean; executionTime: number | null; }
interface Submission { id: number; status: string; code: string; language: string; output?: string; errorMessage?: string; executionTime?: number; createdAt: string; }
interface Solution {
  id: number; userId: number; code: string; language: string; description?: string;
  executionTime?: number; upvotes: number; createdAt: string; isOwn: boolean; hasVoted: boolean;
  userName: string; userUsername: string; userAvatar?: string;
}

interface ProblemDetail {
  id: number; title: string; description: string;
  difficulty: "easy" | "medium" | "hard" | "expert";
  category: string; language: string; points: number; solvedCount: number;
  examples: Example[]; constraints: string[]; starterCode: string;
  hints: string[]; tags: string[]; companyTags: string[];
  hasTestCases: boolean; testCasesCount: number; isSolved: boolean;
  userSubmissions: Submission[];
  performanceStats: { avgTime: number | null; solverCount: number };
  dailyChallenge: { id: number; bonusMultiplier: number; isSolvedToday: boolean } | null;
  packId?: number | null;
}

const difficultyConfig = {
  easy: { label: "سهل", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  medium: { label: "متوسط", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  hard: { label: "صعب", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  expert: { label: "خبير", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
};

const LANGUAGES = ["Python", "JavaScript", "C++", "Java", "Go", "Rust", "TypeScript"];

interface PackProblemNav { id: number; title: string; orderInPack: number; isSolved: boolean; }

export default function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const packId = searchParams.get("packId");
  const trackId = searchParams.get("trackId");

  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [selectedLang, setSelectedLang] = useState("Python");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    status: string; message: string; pointsEarned: number; bonusPointsEarned: number;
    isDailyBonus: boolean; testCaseResults: TestCaseResult[]; passedCount: number;
    testCasesCount: number; streak: number; executionTime: number | null;
    newBadges: Array<{ key: string; icon: string; title: string }>;
    errorMessage?: string;
  } | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "submissions" | "solutions" | "performance">("description");
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [solutionsLoading, setSolutionsLoading] = useState(false);
  const [showShareSolution, setShowShareSolution] = useState(false);
  const [shareDesc, setShareDesc] = useState("");
  const [myPerf, setMyPerf] = useState<{ available: boolean; myTime?: number; percentile?: number; message?: string } | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [packProblems, setPackProblems] = useState<PackProblemNav[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper: next problem in pack
  const currentProblemId = parseInt(id, 10);
  const sortedPackProblems = [...packProblems].sort((a, b) => a.orderInPack - b.orderInPack);
  const currentIdx = sortedPackProblems.findIndex((p) => p.id === currentProblemId);
  const nextProblem = currentIdx >= 0 && currentIdx < sortedPackProblems.length - 1
    ? sortedPackProblems[currentIdx + 1] : null;
  const isLastInPack = currentIdx >= 0 && currentIdx === sortedPackProblems.length - 1;

  useEffect(() => {
    api.get<ProblemDetail>(`/problems/${id}`)
      .then((data) => {
        setProblem(data);
        setCode(data.starterCode || getDefaultStarter(data.language, data.title));
        setSelectedLang(data.language || "Python");
      })
      .catch(() => toast.error("حدث خطأ في تحميل المسألة"))
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch pack problems list for next/prev navigation
  useEffect(() => {
    if (!packId || !trackId) return;
    api.get<{ problems: PackProblemNav[] }>(`/tracks/${trackId}/packs/${packId}`)
      .then((data) => setPackProblems(data.problems ?? []))
      .catch(() => {});
  }, [packId, trackId]);

  useEffect(() => {
    if (activeTab === "solutions" && problem?.isSolved) {
      setSolutionsLoading(true);
      api.get<{ solutions: Solution[]; performanceStats: unknown }>(`/solutions/problem/${id}`)
        .then((d) => setSolutions(d.solutions))
        .catch(() => {})
        .finally(() => setSolutionsLoading(false));
    }
    if (activeTab === "performance" && problem?.isSolved) {
      api.get<{ available: boolean; myTime?: number; percentile?: number; message?: string }>(`/solutions/performance/${id}`)
        .then(setMyPerf)
        .catch(() => {});
    }
  }, [activeTab, problem?.isSolved, id]);

  function getDefaultStarter(lang: string, title: string) {
    const starters: Record<string, string> = {
      Python: `# ${title}\ndef solution():\n    pass\n\nprint(solution())`,
      JavaScript: `// ${title}\nfunction solution() {\n  \n}\nconsole.log(solution());`,
      "C++": `#include <iostream>\nusing namespace std;\nint main() {\n    // ${title}\n    return 0;\n}`,
      Java: `public class Solution {\n    public static void main(String[] args) {\n        // ${title}\n    }\n}`,
      Go: `package main\nimport "fmt"\nfunc main() {\n    // ${title}\n    fmt.Println("")\n}`,
      Rust: `fn main() {\n    // ${title}\n    println!("");\n}`,
      TypeScript: `// ${title}\nfunction solution(): void {\n  \n}\nsolution();`,
    };
    return starters[lang] || starters.Python;
  }

  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = code.substring(0, start) + "    " + code.substring(end);
      setCode(newVal);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 4; }, 0);
    }
  };

  const handleSubmit = async () => {
    if (!user) { toast.error("يجب تسجيل الدخول أولاً"); return; }
    if (!code.trim()) { toast.error("اكتب الكود أولاً"); return; }
    setSubmitting(true);
    setResult(null);
    try {
      const data = await api.post<typeof result>(`/problems/${id}/submit`, {
        code,
        language: selectedLang,
        dailyChallengeId: problem?.dailyChallenge?.id ?? undefined,
      });
      setResult(data);
      if (data?.status === "accepted") {
        toast.success("✅ جميع حالات الاختبار اجتازت!");
        if (data.isDailyBonus) {
          setTimeout(() => toast("🔥 نقاط مضاعفة من التحدي اليومي!", { icon: "⚡" }), 500);
        }
        if (data.streak && data.streak > 1) {
          setTimeout(() => toast(`سلسلة ${data.streak} يوم متتالي! 🔥`, { icon: "🔥" }), 1000);
        }
        if (data.newBadges?.length) {
          data.newBadges.forEach((b, i) => {
            setTimeout(() => toast(`${b.icon} وسام جديد: ${b.title}`, { duration: 4000 }), 1500 + i * 600);
          });
        }
        setProblem((prev) => prev ? { ...prev, isSolved: true } : prev);
      } else {
        toast.error(data?.status === "error" ? "خطأ في الكود" : "إجابة خاطئة");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSolution = async (solutionId: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحل؟")) return;
    try {
      await api.delete(`/solutions/${solutionId}`);
      setSolutions((prev) => prev.filter((s) => s.id !== solutionId));
      toast.success("تم حذف الحل");
    } catch {
      toast.error("فشل حذف الحل");
    }
  };

  const handleVoteSolution = async (solutionId: number) => {
    if (!user) { toast.error("يجب تسجيل الدخول"); return; }
    try {
      const d = await api.post<{ voted: boolean }>(`/solutions/${solutionId}/vote`, {});
      setSolutions((prev) => prev.map((s) =>
        s.id === solutionId
          ? { ...s, hasVoted: d.voted, upvotes: d.voted ? s.upvotes + 1 : s.upvotes - 1 }
          : s
      ));
    } catch { toast.error("حدث خطأ"); }
  };

  const handleShareSolution = async () => {
    if (!problem?.isSolved) { toast.error("يجب حل المسألة أولاً"); return; }
    try {
      await api.post(`/solutions/problem/${id}`, { code, language: selectedLang, description: shareDesc });
      toast.success("تم مشاركة حلك!");
      setShowShareSolution(false);
      if (activeTab === "solutions") {
        api.get<{ solutions: Solution[] }>(`/solutions/problem/${id}`).then((d) => setSolutions(d.solutions)).catch(() => {});
      }
    } catch { toast.error("حدث خطأ في المشاركة"); }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!problem) {
    return (
      <MainLayout>
        <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex flex-col items-center justify-center">
          <Code2 className="w-16 h-16 dark:text-slate-700 text-slate-300 mb-4" />
          <h2 className="text-xl dark:text-white text-slate-900 font-bold mb-2">المسألة غير موجودة</h2>
          <Link href="/problems" className="btn-primary mt-4"><ArrowRight className="w-4 h-4" />العودة</Link>
        </div>
      </MainLayout>
    );
  }

  const diff = difficultyConfig[problem.difficulty] || difficultyConfig.easy;
  const tabs = [
    { id: "description" as const, label: "الوصف", icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: "submissions" as const, label: `محاولاتي (${problem.userSubmissions.length})`, icon: <Terminal className="w-3.5 h-3.5" /> },
    ...(problem.isSolved ? [
      { id: "solutions" as const, label: "حلول المجتمع", icon: <Users className="w-3.5 h-3.5" /> },
      { id: "performance" as const, label: "الأداء", icon: <BarChart2 className="w-3.5 h-3.5" /> },
    ] : []),
  ];

  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        {/* Header */}
        <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100 px-4 sm:px-6 lg:px-8 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/problems" className="flex items-center gap-1 text-sm dark:text-slate-400 text-slate-600 hover:text-cyan-400 transition-colors">
                <ArrowRight className="w-4 h-4" />التحديات
              </Link>
              {packId && trackId && (
                <>
                  <span className="dark:text-slate-600 text-slate-300">/</span>
                  <Link href={`/tracks/${trackId}/packs/${packId}`} className="text-sm dark:text-slate-400 text-slate-600 hover:text-cyan-400 transition-colors">
                    الحزمة
                  </Link>
                </>
              )}
              <span className="dark:text-slate-600 text-slate-300">/</span>
              <h1 className="font-bold dark:text-white text-slate-900 text-sm sm:text-base">{problem.title}</h1>
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${diff.bg} ${diff.border} border ${diff.color}`}>
                {diff.label}
              </span>
              {problem.isSolved && <span className="flex items-center gap-1 text-green-400 text-xs font-semibold"><CheckCircle className="w-3.5 h-3.5" /> محلولة</span>}
              {problem.dailyChallenge && !problem.dailyChallenge.isSolvedToday && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse">
                  <Flame className="w-3 h-3" /> تحدي يومي ×{problem.dailyChallenge.bonusMultiplier}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${diff.bg} ${diff.border} border`}>
                <Star className={`w-3.5 h-3.5 ${diff.color}`} />
                <span className={`text-xs font-bold ${diff.color}`}>
                  {problem.dailyChallenge && !problem.dailyChallenge.isSolvedToday
                    ? `${problem.points * problem.dailyChallenge.bonusMultiplier} نقطة 🔥`
                    : `${problem.points} نقطة`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Left: Description */}
            <div className="space-y-4">
              <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
                <div className="flex border-b dark:border-white/10 border-slate-100 overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
                        activeTab === tab.id
                          ? "text-cyan-400 border-b-2 border-cyan-400"
                          : "dark:text-slate-400 text-slate-600 hover:text-cyan-400"
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {/* ── Description Tab ─── */}
                  {activeTab === "description" && (
                    <div className="space-y-5">
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                        <span className="badge badge-cyan text-xs">{problem.category}</span>
                        <span className="badge text-xs dark:bg-white/5 dark:text-slate-300 bg-slate-100 text-slate-600 border dark:border-white/10 border-slate-200">{problem.language}</span>
                        {(problem.tags as string[]).map((t) => (
                          <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full dark:bg-violet-500/10 bg-violet-50 dark:text-violet-400 text-violet-700 font-mono">
                            <Tag className="w-2.5 h-2.5" />{t}
                          </span>
                        ))}
                        {(problem.companyTags as string[]).map((c) => (
                          <span key={c} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full dark:bg-amber-500/10 bg-amber-50 dark:text-amber-400 text-amber-700">
                            <Building2 className="w-2.5 h-2.5" />{c}
                          </span>
                        ))}
                        {problem.dailyChallenge && (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <Calendar className="w-2.5 h-2.5" /> تحدي اليوم
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs dark:text-slate-400 text-slate-600">
                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-400" />{problem.solvedCount.toLocaleString("ar-EG")} حلّوها</span>
                        {problem.performanceStats.avgTime && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />متوسط {problem.performanceStats.avgTime}ms</span>
                        )}
                      </div>

                      <p className="dark:text-slate-300 text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">
                        {problem.description}
                      </p>

                      {problem.examples?.length > 0 && (
                        <div>
                          <h3 className="font-bold dark:text-white text-slate-900 mb-3 text-sm">أمثلة:</h3>
                          <div className="space-y-3">
                            {problem.examples.map((ex, i) => (
                              <div key={i} className="dark:bg-black/30 bg-slate-50 rounded-xl p-3 border dark:border-white/5 border-slate-200">
                                <div className="mb-2">
                                  <span className="text-xs font-semibold dark:text-slate-400 text-slate-500">المدخل:</span>
                                  <code className="block text-xs dark:text-green-400 text-green-700 font-mono mt-1 whitespace-pre-wrap" dir="ltr">{ex.input}</code>
                                </div>
                                <div className="mb-2">
                                  <span className="text-xs font-semibold dark:text-slate-400 text-slate-500">المخرج:</span>
                                  <code className="block text-xs dark:text-cyan-400 text-cyan-700 font-mono mt-1 whitespace-pre-wrap" dir="ltr">{ex.output}</code>
                                </div>
                                {ex.explanation && <p className="text-xs dark:text-slate-400 text-slate-500 mt-1">{ex.explanation}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {problem.constraints?.length > 0 && (
                        <div>
                          <h3 className="font-bold dark:text-white text-slate-900 mb-2 text-sm">القيود:</h3>
                          <ul className="space-y-1">
                            {problem.constraints.map((c, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm dark:text-slate-400 text-slate-600">
                                <span className="text-cyan-400 mt-0.5">•</span>
                                <code className="font-mono text-xs" dir="ltr">{c}</code>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {problem.hints?.length > 0 && (
                        <div>
                          <button
                            onClick={() => setShowHints(!showHints)}
                            className="flex items-center gap-2 text-amber-400 text-sm font-medium hover:text-amber-300 transition-colors"
                          >
                            <Lightbulb className="w-4 h-4" />
                            {showHints ? "إخفاء" : "عرض"} التلميحات ({problem.hints.length})
                            {showHints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <AnimatePresence>
                            {showHints && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="mt-3 space-y-2">
                                  {problem.hints.map((hint, i) => (
                                    <div key={i} className="flex items-start gap-2 p-3 rounded-xl dark:bg-amber-500/5 bg-amber-50 border dark:border-amber-500/20 border-amber-200">
                                      <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                      <p className="text-sm dark:text-amber-300 text-amber-800">{hint}</p>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Submissions Tab ─── */}
                  {activeTab === "submissions" && (
                    <div className="space-y-3">
                      {problem.userSubmissions.length === 0 ? (
                        <div className="text-center py-8">
                          <Terminal className="w-10 h-10 dark:text-slate-700 text-slate-300 mx-auto mb-2" />
                          <p className="dark:text-slate-400 text-slate-600 text-sm">لا توجد محاولات بعد</p>
                        </div>
                      ) : (
                        problem.userSubmissions.map((sub) => (
                          <div key={sub.id} className="dark:bg-black/30 bg-slate-50 rounded-xl border dark:border-white/5 border-slate-200 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className={`flex items-center gap-1.5 text-xs font-semibold ${sub.status === "accepted" ? "text-green-400" : "text-red-400"}`}>
                                {sub.status === "accepted" ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                {sub.status === "accepted" ? "مقبول" : sub.status === "error" ? "خطأ" : "إجابة خاطئة"}
                              </div>
                              <div className="flex items-center gap-2 text-xs dark:text-slate-500 text-slate-400">
                                <span>{sub.language}</span>
                                {sub.executionTime && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{sub.executionTime}ms</span>}
                                <Clock className="w-3 h-3" />
                                <span>{new Date(sub.createdAt).toLocaleDateString("ar-EG")}</span>
                              </div>
                            </div>
                            {sub.errorMessage && (
                              <div className="text-xs dark:bg-red-500/10 bg-red-50 dark:text-red-300 text-red-800 rounded-lg p-2 mb-2 font-mono whitespace-pre-wrap">
                                {sub.errorMessage}
                              </div>
                            )}
                            <pre className="text-xs dark:text-slate-400 text-slate-600 font-mono overflow-x-auto" dir="ltr">
                              {sub.code.substring(0, 300)}{sub.code.length > 300 ? "..." : ""}
                            </pre>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* ── Solutions Tab ─── */}
                  {activeTab === "solutions" && (
                    <div>
                      {/* Share Solution Button */}
                      <div className="mb-4">
                        <button
                          onClick={() => setShowShareSolution(!showShareSolution)}
                          className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                          شارك حلك مع المجتمع
                        </button>
                        <AnimatePresence>
                          {showShareSolution && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 p-3 dark:bg-black/20 bg-slate-50 rounded-xl border dark:border-white/5 border-slate-200">
                                <textarea
                                  placeholder="وصف مختصر لنهجك (اختياري)..."
                                  value={shareDesc}
                                  onChange={(e) => setShareDesc(e.target.value)}
                                  className="w-full p-2 rounded-lg dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 text-xs outline-none resize-none h-16 mb-2"
                                />
                                <button onClick={handleShareSolution} className="btn-primary text-xs py-1.5">
                                  <Share2 className="w-3.5 h-3.5" />
                                  نشر الحل
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {solutionsLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>
                      ) : solutions.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="w-10 h-10 dark:text-slate-700 text-slate-300 mx-auto mb-2" />
                          <p className="dark:text-slate-400 text-slate-600 text-sm">لا توجد حلول مشتركة بعد — كن الأول!</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {solutions.map((sol) => (
                            <div key={sol.id} className="dark:bg-black/20 bg-slate-50 rounded-xl border dark:border-white/5 border-slate-200 p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white font-bold text-xs">
                                    {sol.userAvatar ? <img src={sol.userAvatar} alt="" className="w-full h-full rounded-full object-cover" /> : sol.userName.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold dark:text-white text-slate-900">{sol.userName}</p>
                                    <p className="text-xs dark:text-slate-500 text-slate-400">{sol.language}{sol.executionTime ? ` • ${sol.executionTime}ms` : ""}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {sol.isOwn && (
                                    <button
                                      onClick={() => handleDeleteSolution(sol.id)}
                                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                                      title="حذف حلي"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleVoteSolution(sol.id)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                      sol.hasVoted
                                        ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-400"
                                        : "dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-600 hover:text-cyan-400"
                                    }`}
                                  >
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                    {sol.upvotes}
                                  </button>
                                </div>
                              </div>
                              {sol.description && <p className="text-xs dark:text-slate-300 text-slate-700 mb-2 italic">{sol.description}</p>}
                              <pre className="text-xs dark:text-slate-300 text-slate-700 font-mono overflow-x-auto dark:bg-black/20 bg-white rounded-lg p-3 border dark:border-white/5 border-slate-200" dir="ltr">
                                {sol.code}
                              </pre>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Performance Tab ─── */}
                  {activeTab === "performance" && (
                    <div className="space-y-5">
                      {!myPerf ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>
                      ) : !myPerf.available ? (
                        <div className="text-center py-8">
                          <BarChart2 className="w-10 h-10 dark:text-slate-700 text-slate-300 mx-auto mb-2" />
                          <p className="dark:text-slate-400 text-slate-600 text-sm">لا تتوفر بيانات أداء بعد</p>
                        </div>
                      ) : (
                        <>
                          <div className="text-center p-6 dark:bg-gradient-to-br dark:from-cyan-900/30 dark:to-violet-900/20 bg-gradient-to-br from-cyan-50 to-violet-50 rounded-2xl border dark:border-cyan-500/20 border-cyan-200">
                            <Zap className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
                            <div className="text-4xl font-black text-cyan-400 mb-1">{myPerf.percentile}%</div>
                            <p className="dark:text-white text-slate-900 font-bold mb-1">{myPerf.message}</p>
                            <p className="text-xs dark:text-slate-400 text-slate-600">وقت الأفضل: {myPerf.myTime}ms</p>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 dark:bg-white/5 bg-slate-100 rounded-xl">
                              <span className="text-sm dark:text-slate-400 text-slate-600 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                وقت تنفيذك
                              </span>
                              <span className="font-bold text-cyan-400">{myPerf.myTime}ms</span>
                            </div>
                            {problem.performanceStats.avgTime && (
                              <div className="flex items-center justify-between p-3 dark:bg-white/5 bg-slate-100 rounded-xl">
                                <span className="text-sm dark:text-slate-400 text-slate-600 flex items-center gap-2">
                                  <BarChart2 className="w-4 h-4" />
                                  متوسط الكل
                                </span>
                                <span className="font-bold dark:text-slate-300 text-slate-700">{problem.performanceStats.avgTime}ms</span>
                              </div>
                            )}
                          </div>

                          {/* Percentile bar */}
                          <div>
                            <div className="flex justify-between text-xs dark:text-slate-400 text-slate-600 mb-1.5">
                              <span>الأبطأ</span>
                              <span>الأسرع</span>
                            </div>
                            <div className="w-full dark:bg-white/10 bg-slate-200 rounded-full h-3 relative">
                              <div
                                className="h-3 rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-green-500"
                                style={{ width: "100%" }}
                              />
                              <div
                                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-cyan-500 transition-all"
                                style={{ left: `${myPerf.percentile ?? 50}%`, transform: "translate(-50%, -50%)" }}
                              />
                            </div>
                            <p className="text-xs dark:text-slate-400 text-slate-600 text-center mt-2">
                              كودك أسرع من {myPerf.percentile}% من المشاركين
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Code Editor */}
            <div className="space-y-4">
              <div className="dark:bg-[#111827] bg-white rounded-2xl border dark:border-white/10 border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b dark:border-white/10 border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/60" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                      <div className="w-3 h-3 rounded-full bg-green-500/60" />
                    </div>
                    <Code2 className="w-4 h-4 dark:text-slate-400 text-slate-500" />
                    <span className="text-xs dark:text-slate-400 text-slate-500 font-mono">
                      solution.{selectedLang === "Python" ? "py" : selectedLang === "JavaScript" ? "js" : selectedLang === "C++" ? "cpp" : selectedLang === "TypeScript" ? "ts" : selectedLang.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedLang}
                      onChange={(e) => { setSelectedLang(e.target.value); setCode(getDefaultStarter(e.target.value, problem.title)); }}
                      className="text-xs px-2 py-1 rounded-lg dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 dark:text-slate-300 text-slate-600 outline-none"
                    >
                      {LANGUAGES.map((l) => <option key={l} value={l} className="dark:bg-[#111827]">{l}</option>)}
                    </select>
                    <button
                      onClick={() => setCode(getDefaultStarter(selectedLang, problem.title))}
                      className="w-7 h-7 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 flex items-center justify-center dark:text-slate-400 text-slate-500 transition-colors"
                      title="إعادة تعيين"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={handleTabKey}
                  className="w-full h-80 p-4 bg-transparent dark:text-slate-200 text-slate-800 font-mono text-sm outline-none resize-none leading-relaxed"
                  dir="ltr"
                  placeholder="اكتب كودك هنا..."
                  spellCheck={false}
                />
              </div>

              {/* Submit */}
              {user ? (
                <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full justify-center py-3 text-base">
                  {submitting ? <><Loader2 className="w-5 h-5 animate-spin" />جاري التحقق...</> : <><Send className="w-5 h-5" />إرسال الحل</>}
                </button>
              ) : (
                <Link href="/auth/login" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 dark:text-slate-300 text-slate-600 font-semibold hover:text-cyan-400 transition-colors">
                  <Lock className="w-5 h-5" />
                  سجل دخولك لإرسال الحل
                </Link>
              )}

              {/* Result */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`rounded-2xl border overflow-hidden ${
                      result.status === "accepted"
                        ? "dark:bg-green-500/10 bg-green-50 border-green-500/20"
                        : result.status === "error"
                        ? "dark:bg-orange-500/10 bg-orange-50 border-orange-500/20"
                        : "dark:bg-red-500/10 bg-red-50 border-red-500/20"
                    }`}
                  >
                    {/* Status Bar */}
                    <div className={`px-4 py-3 flex items-center gap-2 font-semibold border-b ${
                      result.status === "accepted" ? "text-green-400 border-green-500/20" :
                      result.status === "error" ? "text-orange-400 border-orange-500/20" :
                      "text-red-400 border-red-500/20"
                    }`}>
                      {result.status === "accepted" ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
                      <span className="text-sm">
                        {result.status === "accepted"
                          ? `✅ جميع حالات الاختبار اجتازت (${result.testCasesCount})`
                          : result.status === "error"
                          ? "⚠️ خطأ في الكود"
                          : `❌ إجابة خاطئة — نجح ${result.passedCount} من ${result.testCaseResults.length}`}
                      </span>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Error message in Arabic */}
                      {result.errorMessage && result.status !== "accepted" && (
                        <div className="dark:bg-black/20 bg-white/60 rounded-xl p-3 border dark:border-white/10 border-white/60">
                          <p className="text-xs font-semibold mb-1 dark:text-orange-300 text-orange-800">تشخيص الخطأ:</p>
                          <p className="text-xs dark:text-orange-200 text-orange-900 leading-relaxed">{result.errorMessage}</p>
                        </div>
                      )}

                      {/* Test Cases Table */}
                      {result.testCaseResults.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold dark:text-slate-300 text-slate-700 mb-2">حالات الاختبار:</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="dark:text-slate-400 text-slate-600">
                                  <th className="text-right pb-2 pr-2">#</th>
                                  <th className="text-right pb-2 pr-2">المدخل</th>
                                  <th className="text-right pb-2 pr-2">المتوقع</th>
                                  <th className="text-right pb-2 pr-2">ناتجك</th>
                                  <th className="text-right pb-2">الحالة</th>
                                </tr>
                              </thead>
                              <tbody>
                                {result.testCaseResults.map((tc, i) => (
                                  <tr key={i} className={`border-t ${tc.passed ? "dark:border-green-500/10 border-green-100" : "dark:border-red-500/10 border-red-100"}`}>
                                    <td className="py-1.5 pr-2 dark:text-slate-400 text-slate-600">{i + 1}</td>
                                    <td className="py-1.5 pr-2 font-mono dark:text-slate-300 text-slate-700 max-w-[80px] truncate" dir="ltr">{tc.input}</td>
                                    <td className="py-1.5 pr-2 font-mono text-cyan-500 max-w-[80px] truncate" dir="ltr">{tc.expected}</td>
                                    <td className={`py-1.5 pr-2 font-mono max-w-[80px] truncate ${tc.passed ? "text-green-400" : "text-red-400"}`} dir="ltr">{tc.got}</td>
                                    <td className="py-1.5">
                                      {tc.passed
                                        ? <CheckCircle className="w-4 h-4 text-green-400" />
                                        : <XCircle className="w-4 h-4 text-red-400" />
                                      }
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Points & Badges */}
                      {result.status === "accepted" && (
                        <>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {result.pointsEarned > 0 && (
                                <div className="flex items-center gap-1.5 text-sm">
                                  <Trophy className="w-4 h-4 text-amber-400" />
                                  <span className="text-amber-400 font-bold">+{result.pointsEarned} نقطة</span>
                                </div>
                              )}
                              {result.isDailyBonus && result.bonusPointsEarned > 0 && (
                                <div className="flex items-center gap-1.5 text-sm">
                                  <Flame className="w-4 h-4 text-orange-400" />
                                  <span className="text-orange-400 font-bold">+{result.bonusPointsEarned} مكافأة يومية</span>
                                </div>
                              )}
                              {result.executionTime && (
                                <div className="flex items-center gap-1.5 text-sm dark:text-slate-400 text-slate-600">
                                  <Clock className="w-4 h-4" />
                                  <span>{result.executionTime}ms</span>
                                </div>
                              )}
                            </div>
                            {result.newBadges?.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {result.newBadges.map((b) => (
                                  <span key={b.key} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold">
                                    {b.icon} {b.title}
                                  </span>
                                ))}
                              </div>
                            )}
                            {/* Share Card Button */}
                            <button
                              onClick={() => setShowShareCard(true)}
                              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg dark:bg-white/10 bg-white border dark:border-white/10 border-slate-200 dark:text-slate-300 text-slate-600 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              شارك إنجازك
                            </button>
                          </div>

                          {/* ── Next Problem Navigation (Pack Context) ── */}
                          {packId && trackId && (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                              className="mt-3 pt-3 border-t dark:border-green-500/20 border-green-200"
                            >
                              {nextProblem ? (
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs dark:text-slate-400 text-slate-500 mb-0.5">المسألة التالية في الحزمة</p>
                                    <p className="text-sm font-semibold dark:text-white text-slate-900 truncate">{nextProblem.title}</p>
                                  </div>
                                  <Link
                                    href={`/problems/${nextProblem.id}?packId=${packId}&trackId=${trackId}`}
                                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-sm transition-all shadow-lg shadow-cyan-500/20"
                                  >
                                    التالية
                                    <ArrowLeft className="w-4 h-4" />
                                  </Link>
                                </div>
                              ) : isLastInPack ? (
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex-1">
                                    <p className="text-xs text-amber-400 font-semibold mb-0.5">🎉 أكملت كل مسائل الحزمة!</p>
                                    <p className="text-xs dark:text-slate-400 text-slate-500">ممتاز! انتقل للحزمة التالية الآن</p>
                                  </div>
                                  <Link
                                    href={`/tracks/${trackId}/packs/${packId}`}
                                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-sm transition-all shadow-lg shadow-amber-500/20"
                                  >
                                    <Trophy className="w-4 h-4" />
                                    إكمال الحزمة
                                  </Link>
                                </div>
                              ) : null}
                            </motion.div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ── Snippet Share Card Modal ── */}
      <AnimatePresence>
        {showShareCard && result && problem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowShareCard(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              {/* Card Preview */}
              <div
                id="share-card"
                className="relative overflow-hidden rounded-2xl p-6"
                style={{
                  background: "linear-gradient(135deg, #06090f 0%, #0d1526 50%, #0a1628 100%)",
                  border: "1px solid rgba(6,182,212,0.3)",
                  boxShadow: "0 0 40px rgba(6,182,212,0.15), inset 0 0 40px rgba(6,182,212,0.03)",
                }}
              >
                {/* Glow accent */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-20 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
                      <Code2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white font-black text-lg tracking-tight">Nouvil</span>
                  </div>
                  <span className="text-xs text-cyan-400/70 font-mono">nouvil.com</span>
                </div>

                {/* Problem info */}
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                      problem.difficulty === "easy" ? "bg-green-500/20 text-green-400"
                      : problem.difficulty === "medium" ? "bg-amber-500/20 text-amber-400"
                      : problem.difficulty === "hard" ? "bg-red-500/20 text-red-400"
                      : "bg-violet-500/20 text-violet-400"
                    }`}>
                      {problem.difficulty === "easy" ? "سهل" : problem.difficulty === "medium" ? "متوسط" : problem.difficulty === "hard" ? "صعب" : "خبير"}
                    </span>
                    <span className="text-xs text-slate-500">{problem.language}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white leading-snug">{problem.title}</h2>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                    <div className="text-amber-400 font-black text-xl">+{result.pointsEarned}</div>
                    <div className="text-slate-500 text-xs mt-0.5">نقاط</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                    <div className="text-green-400 font-black text-xl">✓</div>
                    <div className="text-slate-500 text-xs mt-0.5">تم الحل</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                    <div className="text-cyan-400 font-black text-xl">{result.executionTime ?? "—"}ms</div>
                    <div className="text-slate-500 text-xs mt-0.5">زمن التنفيذ</div>
                  </div>
                </div>

                {/* User */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                    {user?.name?.charAt(0) ?? "م"}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{user?.name ?? "مستخدم"}</p>
                    <p className="text-slate-500 text-xs">حل هذه المسألة</p>
                  </div>
                  <div className="mr-auto flex items-center gap-1 text-amber-400">
                    <Trophy className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">{problem.points} pts</span>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(
                      `حللت مسألة "${problem.title}" على Nouvil وحصلت على +${result.pointsEarned} نقطة! 🚀\n${url}`
                    );
                    toast.success("تم نسخ الرابط");
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 border border-white/10 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition-all text-sm font-medium"
                >
                  <Share2 className="w-4 h-4" />
                  نسخ الرابط
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`حللت مسألة "${problem.title}" على منصة Nouvil وحصلت على +${result.pointsEarned} نقطة! 🚀\n${window.location.href}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-all text-sm font-medium"
                >
                  𝕏 مشاركة
                </a>
                <button
                  onClick={() => setShowShareCard(false)}
                  className="px-4 py-2.5 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 dark:text-slate-400 text-slate-600 hover:text-red-400 transition-all text-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}
