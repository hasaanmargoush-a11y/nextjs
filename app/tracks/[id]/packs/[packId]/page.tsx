"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { motion } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import {
  ArrowRight, Code2, CheckCircle, ChevronRight,
  Star, Loader2, Target, Lock, Trophy, Flame
} from "lucide-react";

interface PackProblem {
  id: number;
  title: string;
  difficulty: "easy" | "medium" | "hard" | "expert";
  points: number;
  solvedCount: number;
  language: string;
  tags: string[];
  orderInPack: number;
  isSolved: boolean;
}

interface PackDetail {
  id: number;
  trackId: number;
  title: string;
  description: string;
  totalProblems: number;
  problems: PackProblem[];
  userProgress: { solvedCount: number; total: number };
}

const difficultyConfig = {
  easy: { label: "سهل", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  medium: { label: "متوسط", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  hard: { label: "صعب", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  expert: { label: "خبير", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
};

export default function PackDetailPage({ params }: { params: Promise<{ id: string; packId: string }> }) {
  const { id: trackId, packId } = use(params);
  const { user } = useAuth();
  const [pack, setPack] = useState<PackDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PackDetail>(`/tracks/${trackId}/packs/${packId}`)
      .then(setPack)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [trackId, packId]);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!pack) {
    return (
      <MainLayout>
        <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50 flex flex-col items-center justify-center">
          <Target className="w-16 h-16 dark:text-slate-700 text-slate-300 mb-4" />
          <h2 className="text-xl font-bold dark:text-white text-slate-900 mb-2">الحزمة غير موجودة</h2>
          <Link href={`/tracks/${trackId}`} className="btn-primary mt-4">
            <ArrowRight className="w-4 h-4" />
            العودة للمسار
          </Link>
        </div>
      </MainLayout>
    );
  }

  const { solvedCount, total } = pack.userProgress;
  const pct = total > 0 ? Math.round((solvedCount / total) * 100) : 0;
  const isCompleted = solvedCount >= total && total > 0;

  return (
    <MainLayout>
      <div className="min-h-screen dark:bg-[#0a0f1e] bg-slate-50">
        {/* Header */}
        <div className="dark:bg-[#070b14] bg-white border-b dark:border-white/5 border-slate-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-2 mb-4 text-sm">
              <Link href="/problems" className="dark:text-slate-500 text-slate-400 hover:text-cyan-400 transition-colors">التحديات</Link>
              <span className="dark:text-slate-600 text-slate-300">/</span>
              <Link href={`/tracks/${trackId}`} className="dark:text-slate-500 text-slate-400 hover:text-cyan-400 transition-colors">المسار</Link>
              <span className="dark:text-slate-600 text-slate-300">/</span>
              <span className="dark:text-white text-slate-900 font-medium">{pack.title}</span>
            </div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-black dark:text-white text-slate-900 mb-1">{pack.title}</h1>
                  {pack.description && (
                    <p className="dark:text-slate-400 text-slate-600 text-sm">{pack.description}</p>
                  )}
                </div>
                {isCompleted && (
                  <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                    <Trophy className="w-5 h-5" />
                    الحزمة مكتملة! 🎉
                  </div>
                )}
              </div>

              {user && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="dark:text-slate-400 text-slate-600">
                      {solvedCount} من {total} مسألة محلولة
                    </span>
                    <span className={`font-bold ${isCompleted ? "text-green-400" : "text-cyan-400"}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full dark:bg-white/10 bg-slate-200 rounded-full h-2">
                    <motion.div
                      className={`h-2 rounded-full ${isCompleted ? "bg-green-500" : "bg-gradient-to-r from-cyan-500 to-violet-500"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Problems List */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {pack.problems.length === 0 ? (
            <div className="text-center py-16">
              <Target className="w-12 h-12 dark:text-slate-700 text-slate-300 mx-auto mb-3" />
              <p className="dark:text-slate-400 text-slate-600">لا توجد مسائل في هذه الحزمة بعد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pack.problems.map((problem, i) => {
                const diff = difficultyConfig[problem.difficulty] ?? difficultyConfig.easy;
                const isLocked = !user;

                return (
                  <motion.div
                    key={problem.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ x: -4 }}
                  >
                    <Link href={isLocked ? "/auth/login" : `/problems/${problem.id}?packId=${packId}&trackId=${trackId}`}>
                      <div className={`rounded-2xl border p-4 transition-all group flex items-center gap-4 ${
                        problem.isSolved
                          ? "dark:bg-green-500/5 bg-green-50 dark:border-green-500/20 border-green-200"
                          : "dark:bg-[#111827] bg-white dark:border-white/10 border-slate-200 hover:border-cyan-500/30"
                      }`}>
                        {/* Step number */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${
                          problem.isSolved
                            ? "bg-green-500/20 text-green-400"
                            : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-600"
                        }`}>
                          {problem.isSolved ? <CheckCircle className="w-5 h-5" /> : (i + 1)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold mb-1 group-hover:text-cyan-400 transition-colors truncate ${
                            problem.isSolved ? "text-green-400" : "dark:text-white text-slate-900"
                          }`}>
                            {problem.title}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${diff.bg} ${diff.border} border ${diff.color}`}>
                              {diff.label}
                            </span>
                            <span className="text-xs dark:text-slate-400 text-slate-500">{problem.language}</span>
                            {(problem.tags as string[]).slice(0, 2).map((t) => (
                              <span key={t} className="text-xs px-2 py-0.5 rounded-full dark:bg-violet-500/10 bg-violet-50 dark:text-violet-400 text-violet-700 font-mono hidden sm:inline">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${diff.bg} ${diff.border} border`}>
                            <Star className={`w-3 h-3 ${diff.color}`} />
                            <span className={`text-xs font-bold ${diff.color}`}>{problem.points}</span>
                          </div>
                          {isLocked && <Lock className="w-4 h-4 dark:text-slate-600 text-slate-300" />}
                          <ChevronRight className="w-4 h-4 dark:text-slate-600 text-slate-300 group-hover:text-cyan-400 transition-colors" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}

          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-6 rounded-2xl dark:bg-gradient-to-r dark:from-green-900/30 dark:to-emerald-900/20 bg-gradient-to-r from-green-50 to-emerald-50 border dark:border-green-500/20 border-green-200 text-center"
            >
              <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h3 className="font-black text-xl dark:text-white text-slate-900 mb-2">أكملت هذه الحزمة! 🎉</h3>
              <p className="dark:text-slate-400 text-slate-600 text-sm mb-4">
                ممتاز! انتقل للحزمة التالية لتكمل مسارك
              </p>
              <Link href={`/tracks/${trackId}`} className="btn-primary inline-flex">
                <Flame className="w-4 h-4" />
                الحزمة التالية
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
